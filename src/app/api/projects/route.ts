import { NextResponse } from 'next/server';
import { db } from '../../../core/db';
import { projects, meetings } from '../../../core/db/schema';
import redisConnection from '../../../core/redis';
import { eq } from 'drizzle-orm';
import { rateLimit } from '../../../backend/security/rateLimit';

const CACHE_KEY = 'cache:projects:all';
const CACHE_TTL = 300; // Cache por 5 minutos

async function invalidateProjectsCache() {
  try {
    await redisConnection.del(CACHE_KEY);
    await redisConnection.del('cache:stats');
  } catch (err) {
    console.warn('Failed to invalidate Redis cache for projects:', err);
  }
}

export async function GET() {
  try {
    // 1. Intentar leer de la caché de Redis
    try {
      const cached = await redisConnection.get(CACHE_KEY);
      if (cached) {
        return NextResponse.json({ ...JSON.parse(cached), fromCache: true });
      }
    } catch (cacheErr) {
      console.warn('Redis Cache Read Failed for projects:', cacheErr);
    }

    // 2. Consultar base de datos
    let list = await db.select().from(projects).orderBy(projects.createdAt);

    // Seed automático si la tabla está vacía para facilidad de uso
    if (list.length === 0) {
      const defaults = [
        { name: 'Rediseño UI/UX', description: 'Proyecto de modernización del diseño visual del portal y vistas responsivas.' },
        { name: 'Infraestructura Cloud', description: 'Migración y optimización de servidores VPS, bases de datos y clusters Redis.' },
        { name: 'Integración Inteligencia Artificial', description: 'Desarrollo de workers y conectores de transcripción y generación de tareas con LLMs.' }
      ];

      for (const p of defaults) {
        await db.insert(projects).values(p).execute();
      }

      // Re-consultar
      list = await db.select().from(projects).orderBy(projects.createdAt);
    }

    const responseData = {
      success: true,
      data: list
    };

    // 3. Guardar en la caché de Redis
    try {
      await redisConnection.set(CACHE_KEY, JSON.stringify(responseData), 'EX', CACHE_TTL);
    } catch (cacheErr) {
      console.warn('Redis Cache Write Failed for projects:', cacheErr);
    }

    return NextResponse.json({ ...responseData, fromCache: false });
  } catch (err: any) {
    console.error('Error in GET /api/projects:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await rateLimit(ip, 30, 60);
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Has excedido el límite de solicitudes para crear proyectos.' }),
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Bad Request', message: 'Project Name is required' }, { status: 400 });
    }

    const [newProject] = await db.insert(projects).values({
      name: name.trim(),
      description: description || null
    }).returning();

    // Invalidar caché
    await invalidateProjectsCache();

    return NextResponse.json({ success: true, data: newProject }, { status: 201 });
  } catch (err: any) {
    console.error('Error in POST /api/projects:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await rateLimit(ip, 30, 60);
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Has excedido el límite de solicitudes para modificar proyectos.' }),
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { id, name, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bad Request', message: 'Project ID is required' }, { status: 400 });
    }

    const [updated] = await db.update(projects)
      .set({
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description })
      })
      .where(eq(projects.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Not Found', message: 'Project not found' }, { status: 404 });
    }

    // Invalidar caché
    await invalidateProjectsCache();

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error in PATCH /api/projects:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await rateLimit(ip, 30, 60);
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Has excedido el límite de solicitudes para eliminar proyectos.' }),
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Bad Request', message: 'Project ID is required' }, { status: 400 });
    }

    const [deleted] = await db.delete(projects)
      .where(eq(projects.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Not Found', message: 'Project not found' }, { status: 404 });
    }

    // Borrar las reuniones asociadas a este proyecto por nombre de proyecto
    if (deleted.name) {
      await db.delete(meetings)
        .where(eq(meetings.project, deleted.name));
    }

    // Invalidar caché
    await invalidateProjectsCache();

    return NextResponse.json({ success: true, data: deleted });
  } catch (err: any) {
    console.error('Error in DELETE /api/projects:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}

