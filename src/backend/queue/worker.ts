import { Worker, Job } from 'bullmq';
import redisConnection from '@/core/redis';
import { db } from '@/core/db';
import { meetings, tasks } from '@/core/db/schema';
import { eq } from 'drizzle-orm';
import { ai } from '@/core/gemini';

export const transcriptionWorker = new Worker(
  'meeting-transcription',
  async (job: Job) => {
    const { meetingId, audioUrl, fileName, model, tone } = job.data;
    
    console.log(`[Job ${job.id}] Iniciando procesamiento de la reunión ${meetingId}...`);
    
    try {
      // 1. Cambiar el estado de la reunión en Supabase a 'PROCESANDO' vía Drizzle (evita RLS)
      await db
        .update(meetings)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(meetings.id, meetingId));
        
      // 2. Descargar el archivo temporalmente desde Supabase Storage
      console.log(`[Job ${job.id}] Descargando audio/video de la reunión desde ${audioUrl}...`);
      const fetchResponse = await fetch(audioUrl);
      if (!fetchResponse.ok) {
        throw new Error(`Failed to download audio from ${audioUrl}: ${fetchResponse.statusText}`);
      }
      const arrayBuffer = await fetchResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      let mimeType = 'audio/mp3';
      if (fileName.toLowerCase().endsWith('.wav')) mimeType = 'audio/wav';
      else if (fileName.toLowerCase().endsWith('.m4a')) mimeType = 'audio/x-m4a';
      else if (fileName.toLowerCase().endsWith('.mp4')) mimeType = 'video/mp4';
      else if (fileName.toLowerCase().endsWith('.webm')) mimeType = 'audio/webm';
      
      // 3. Procesar con Gemini 1.5 Flash (Multimodal)
      console.log(`[Job ${job.id}] Transcribiendo y extrayendo tareas usando Gemini (modelo: ${model || 'Gemini 1.5 Flash'})...`);
      
      const customTonePrompt = 
        tone === 1 
          ? "Proporciona una transcripción altamente resumida y directa de los puntos clave de la reunión en español."
          : tone === 3 
            ? "Proporciona una transcripción analítica y crítica de la reunión en español, destacando cualquier desacuerdo o riesgo mencionado."
            : "Proporciona una transcripción completa, limpia y muy precisa de la reunión en español.";

      const prompt = `Actúas como un asistente experto de reuniones. Realiza las siguientes dos tareas:
1. ${customTonePrompt}
2. Analiza el audio de la reunión y extrae todas las tareas/acciones accionables. Para cada tarea, extrae:
   - title: Un título corto y conciso en español de la tarea
   - description: Instrucciones claras y detalladas de lo que se debe hacer
   - assignee: La persona responsable asignada (busca nombres de personas en la reunión)
   - due_date: La fecha límite o estimación de entrega mencionada, en formato YYYY-MM-DD (si no se menciona, deja un string vacío)

Proporciona la respuesta ESTRICTAMENTE en este formato JSON:
{
  "transcript": "escribe aquí toda la transcripción...",
  "tasks": [
    {
      "title": "Título de la tarea",
      "description": "Descripción de la tarea",
      "assignee": "Nombre",
      "due_date": "YYYY-MM-DD o vacío"
    }
  ]
}`;

      const geminiModel = 'gemini-2.5-flash'; // Forzamos 2.5-flash para óptimo consumo, velocidad y compatibilidad de API

      const geminiResponse = await ai.models.generateContent({
        model: geminiModel,
        contents: [
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: mimeType
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = geminiResponse.text;
      if (!responseText) {
        throw new Error('Gemini API did not return any text response (possible content safety block or network empty body).');
      }
      console.log(`[Job ${job.id}] Respuesta obtenida de Gemini:`, responseText);

      let parsedResult;
      try {
        parsedResult = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`[Job ${job.id}] Fallo al parsear respuesta JSON directa, intentando limpiar markdown blocks...`);
        const cleaned = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(cleaned);
      }

      const cleanTranscript = parsedResult.transcript || "No se pudo generar la transcripción.";
      const cleanTasks = parsedResult.tasks || [];

      // 4. Guardar tareas en base de datos vía Drizzle (evita RLS)
      console.log(`[Job ${job.id}] Guardando transcripción y tareas en la base de datos...`);
      
      // Insertar transcripción en la reunión
      await db
        .update(meetings)
        .set({ 
          status: 'completed', 
          transcript: cleanTranscript,
          updatedAt: new Date() 
        })
        .where(eq(meetings.id, meetingId));

      // Insertar todas las tareas de una sola vez (Bulk Insert)
      if (cleanTasks.length > 0) {
        await db
          .insert(tasks)
          .values(
            cleanTasks.map((task: any) => ({
              meetingId: meetingId,
              title: task.title,
              description: task.description,
              assignee: task.assignee,
              dueDate: task.due_date || null,
              status: 'pending'
            }))
          );
      }
      
      console.log(`[Job ${job.id}] ¡Reunión ${meetingId} procesada con éxito!`);
      
      // Invalidar caché de estadísticas y reuniones
      try {
        await redisConnection.del('cache:stats');
      } catch (_) {}

      return { success: true };
      
    } catch (error) {
      console.error(`[Job ${job.id}] Error procesando reunión ${meetingId}:`, error);
      
      // Cambiar estado a 'fallido' en Supabase vía Drizzle (evita RLS)
      await db
        .update(meetings)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(meetings.id, meetingId));
        
      throw error; // Re-lanzar para que BullMQ registre el fallo y reintente
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 2, // Procesar hasta 2 audios en paralelo por este worker
  }
);

