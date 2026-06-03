import { NextResponse } from 'next/server';
import { db } from '../../../core/db';
import { tasks, meetings } from '../../../core/db/schema';
import { rateLimit } from '../../../backend/security/rateLimit';
import { eq, sql } from 'drizzle-orm';
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
    const meetingId = searchParams.get('meetingId');
    const project = searchParams.get('project');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10); // Límite por página (default 10)
    const offset = (page - 1) * limit;

    // Si no hay filtro, no buscamos (retorna lista vacía)
    if (!meetingId && (!project || project === 'todos')) {
      return NextResponse.json(
        { 
          success: true, 
          data: [], 
          pagination: { page, limit, total: 0 } 
        },
        {
          status: 200,
          headers: {
            'X-RateLimit-Limit': limitResult.limit.toString(),
            'X-RateLimit-Remaining': limitResult.remaining.toString(),
            'X-RateLimit-Reset': limitResult.reset.toString(),
          },
        }
      );
    }

    let list: any[] = [];
    let total = 0;

    if (meetingId && meetingId !== 'todas') {
      // Filtrar por reunión
      const [countRes] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(tasks)
        .where(eq(tasks.meetingId, meetingId));
      total = countRes?.count || 0;

      list = await db
        .select()
        .from(tasks)
        .where(eq(tasks.meetingId, meetingId))
        .orderBy(tasks.createdAt)
        .limit(limit)
        .offset(offset);
    } else if (project && project !== 'todos') {
      // Filtrar por proyecto uniendo las tablas tasks y meetings
      const [countRes] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(tasks)
        .innerJoin(meetings, eq(tasks.meetingId, meetings.id))
        .where(eq(meetings.project, project));
      total = countRes?.count || 0;

      const res = await db
        .select({
          id: tasks.id,
          meetingId: tasks.meetingId,
          title: tasks.title,
          description: tasks.description,
          assignee: tasks.assignee,
          dueDate: tasks.dueDate,
          status: tasks.status,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt
        })
        .from(tasks)
        .innerJoin(meetings, eq(tasks.meetingId, meetings.id))
        .where(eq(meetings.project, project))
        .orderBy(tasks.createdAt)
        .limit(limit)
        .offset(offset);
      list = res;
    }

    return NextResponse.json(
      { 
        success: true, 
        data: list, 
        pagination: { page, limit, total } 
      },
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
    console.error('Error interno en GET /api/tasks:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await rateLimit(ip, 60, 60);
  
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Has excedido el límite de solicitudes.' }),
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { id, title, description, assignee, dueDate, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bad Request', message: 'Task ID is required' }, { status: 400 });
    }

    const [updated] = await db
      .update(tasks)
      .set({
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(assignee !== undefined && { assignee }),
        ...(dueDate !== undefined && { dueDate }),
        ...(status !== undefined && { status }),
        updatedAt: new Date()
      })
      .where(eq(tasks.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Not Found', message: 'Task not found' }, { status: 404 });
    }

    // Invalidar caché de estadísticas si cambia el estado
    try {
      await redisConnection.del('cache:stats');
    } catch (_) {}

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error in PATCH /api/tasks:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}

