import { NextResponse } from 'next/server';
import { supabase } from '../../../core/supabase';
import { transcriptionQueue } from '../../../backend/queue/transcriptionQueue';
import { rateLimit } from '../../../backend/security/rateLimit';
import { db } from '../../../core/db';
import { meetings } from '../../../core/db/schema';

export async function POST(request: Request) {
  // 1. Obtener IP del cliente para rate-limiting
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  
  // Límite estricto de subidas: 5 por minuto por IP para evitar abusos
  const limitResult = await rateLimit(ip, 5, 60);
  
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too Many Requests', 
        message: 'Has excedido el límite de subidas. Por favor, espera un minuto e intenta de nuevo.' 
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limitResult.limit.toString(),
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': limitResult.reset.toString(),
        },
      }
    );
  }

  try {
    // 2. Parsear el cuerpo de la petición como FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string || 'Nueva Reunión';
    const project = formData.get('project') as string || '';
    const membersString = formData.get('members') as string || '[]';
    const model = formData.get('model') as string || 'Gemini 1.5 Flash';
    const toneString = formData.get('tone') as string || '2';
    const tone = parseInt(toneString, 10);

    // 3. Validaciones de Seguridad del Archivo
    if (!file) {
      return NextResponse.json({ error: 'Bad Request', message: 'No se ha subido ningún archivo.' }, { status: 400 });
    }

    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.webm'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      return NextResponse.json({ 
        error: 'Bad Request', 
        message: `Formato de archivo no permitido. Solo se aceptan: ${allowedExtensions.join(', ')}` 
      }, { status: 400 });
    }

    const maxSizeBytes = 500 * 1024 * 1024; // 500 MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ 
        error: 'Bad Request', 
        message: 'El tamaño de archivo excede el límite máximo de 500 MB.' 
      }, { status: 400 });
    }

    // 4. Subir archivo a Supabase Storage (Bucket "audios")
    const fileBuffer = await file.arrayBuffer();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;
    
    console.log(`[Upload] Subiendo archivo ${fileName} (${file.size} bytes)...`);
    
    // Subir el buffer al storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('audios')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (storageError) {
      console.error('Error subiendo a Supabase Storage:', storageError);
      return NextResponse.json({ 
        error: 'Storage Error', 
        message: 'No se pudo guardar el archivo de audio. Verifica que el bucket "audios" exista en Supabase.' 
      }, { status: 500 });
    }

    // Obtener la URL pública del archivo
    const { data: { publicUrl } } = supabase.storage
      .from('audios')
      .getPublicUrl(fileName);

    // Parsear miembros para guardarlos estructuradamente
    let members = [];
    try {
      members = JSON.parse(membersString);
    } catch (_) {}

    // 5. Crear registro de reunión en Supabase vía Drizzle ORM (evita conflictos de RLS en anon_key)
    console.log(`[Upload] Creando registro de reunión en la base de datos vía Drizzle...`);
    let meeting;
    try {
      const [newMeeting] = await db.insert(meetings).values({
        title,
        project,
        members,
        audioUrl: publicUrl,
        fileName: fileName,
        status: 'pending',
      }).returning();
      meeting = newMeeting;
    } catch (dbError: any) {
      console.error('Error insertando reunión en base de datos vía Drizzle:', dbError);
      // Intentar limpiar el archivo huérfano en el storage
      await supabase.storage.from('audios').remove([fileName]);
      return NextResponse.json({ error: 'Database Error', message: dbError.message }, { status: 500 });
    }

    // 6. Encolar el procesamiento en BullMQ
    console.log(`[Upload] Encolando procesamiento de reunión ${meeting.id} en BullMQ...`);
    const job = await transcriptionQueue.add('process-meeting', {
      meetingId: meeting.id,
      audioUrl: publicUrl,
      fileName: fileName,
      model,
      tone
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Reunión cargada y encolada con éxito para análisis.', 
        meetingId: meeting.id,
        jobId: job.id 
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': limitResult.limit.toString(),
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': limitResult.reset.toString(),
        },
      }
    );
  } catch (err: any) {
    console.error('Error crítico en /api/upload:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
