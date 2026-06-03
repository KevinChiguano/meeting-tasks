import { NextResponse } from 'next/server';
import { db } from '../../../core/db';
import { meetings } from '../../../core/db/schema';
import { rateLimit } from '../../../backend/security/rateLimit';
import { eq, desc } from 'drizzle-orm';
import redisConnection from '../../../core/redis';

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await rateLimit(ip, 60, 60);
  
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Has excedido el límite de solicitudes. Por favor, intenta de nuevo más tarde.' }),
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
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const orderParam = searchParams.get('order') || 'asc';

    let baseQuery = db.select().from(meetings);

    if (orderParam === 'desc') {
      baseQuery.orderBy(desc(meetings.createdAt));
    } else {
      baseQuery.orderBy(meetings.createdAt);
    }

    if (limitParam) {
      const limitVal = parseInt(limitParam, 10);
      if (!isNaN(limitVal)) {
        baseQuery.limit(limitVal);
      }
    }

    if (offsetParam) {
      const offsetVal = parseInt(offsetParam, 10);
      if (!isNaN(offsetVal)) {
        baseQuery.offset(offsetVal);
      }
    }

    const list = await baseQuery;

    // Mapear los campos a formato camelCase o snake_case según el modelo esperado (Supabase JS usa snake_case).
    // Para asegurar retrocompatibilidad completa con el frontend, mapearemos los campos de Drizzle
    // a los nombres de columna del Supabase JS Client (snake_case).
    const formattedMeetings = list.map((mtg: any) => ({
      idx: 0, // Indice simulado si se requiere
      id: mtg.id,
      title: mtg.title,
      project: mtg.project,
      members: Array.isArray(mtg.members) ? JSON.stringify(mtg.members) : mtg.members,
      audio_url: mtg.audioUrl,
      file_name: mtg.fileName,
      status: mtg.status,
      transcript: mtg.transcript,
      created_at: mtg.createdAt,
      updated_at: mtg.updatedAt
    }));

    return NextResponse.json(
      { success: true, data: formattedMeetings },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': limitResult.limit.toString(),
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': limitResult.reset.toString(),
        },
      }
    );
  } catch (err: any) {
    console.error('Error interno en GET /api/meetings:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await rateLimit(ip, 60, 60);
  
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Has excedido el límite de solicitudes. Por favor, intenta de nuevo más tarde.' }),
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Bad Request', message: 'Meeting ID is required' }, { status: 400 });
    }

    const [deleted] = await db.delete(meetings)
      .where(eq(meetings.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Not Found', message: 'Meeting not found' }, { status: 404 });
    }

    // Invalida caché de estadísticas
    try {
      await redisConnection.del('cache:stats');
    } catch (cacheErr) {
      console.warn('Failed to invalidate Redis cache for stats on meeting delete:', cacheErr);
    }

    return NextResponse.json({ success: true, data: deleted });
  } catch (err: any) {
    console.error('Error in DELETE /api/meetings:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}


