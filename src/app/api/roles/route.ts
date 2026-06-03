import { NextResponse } from 'next/server';
import { db } from '../../../core/db';
import { roles } from '../../../core/db/schema';
import { eq } from 'drizzle-orm';
import redisConnection from '../../../core/redis';
import { rateLimit } from '../../../backend/security/rateLimit';

const CACHE_KEY = 'cache:roles:all';
const CACHE_TTL = 300; // Cache por 5 minutos

async function invalidateRolesCache() {
  try {
    await redisConnection.del(CACHE_KEY);
    // Invalidar también las estadísticas ya que los conteos de roles o relaciones pudieron cambiar
    await redisConnection.del('cache:stats');
  } catch (err) {
    console.warn('Failed to invalidate Redis cache for roles:', err);
  }
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await rateLimit(ip, 60, 60);
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Has excedido el límite de solicitudes.' }),
      { status: 429 }
    );
  }

  try {
    // 1. Intentar obtener de la caché de Redis
    try {
      const cached = await redisConnection.get(CACHE_KEY);
      if (cached) {
        return NextResponse.json({ ...JSON.parse(cached), fromCache: true });
      }
    } catch (cacheErr) {
      console.warn('Redis Cache Read Failed for roles:', cacheErr);
    }

    // 2. Consultar base de datos
    const list = await db.select().from(roles).orderBy(roles.name);

    const responseData = {
      success: true,
      data: list
    };

    // 3. Guardar en la caché de Redis
    try {
      await redisConnection.set(CACHE_KEY, JSON.stringify(responseData), 'EX', CACHE_TTL);
    } catch (cacheErr) {
      console.warn('Redis Cache Write Failed for roles:', cacheErr);
    }

    return NextResponse.json({ ...responseData, fromCache: false });
  } catch (err: any) {
    console.error('Error in GET /api/roles:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await rateLimit(ip, 30, 60);
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Has excedido el límite de solicitudes.' }),
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { id, name, description } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Bad Request', message: 'ID and Name are required' }, { status: 400 });
    }

    // Asegurar que el id de rol esté en minúsculas y limpio
    const cleanId = id.toLowerCase().trim().replace(/\s+/g, '-');

    const [newRole] = await db.insert(roles).values({
      id: cleanId,
      name: name.trim(),
      description: description || null
    }).returning();

    // Invalidar caché
    await invalidateRolesCache();

    return NextResponse.json({ success: true, data: newRole }, { status: 201 });
  } catch (err: any) {
    console.error('Error in POST /api/roles:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await rateLimit(ip, 30, 60);
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Has excedido el límite de solicitudes.' }),
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { id, name, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bad Request', message: 'Role ID is required' }, { status: 400 });
    }

    const [updated] = await db.update(roles)
      .set({
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description })
      })
      .where(eq(roles.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Not Found', message: 'Role not found' }, { status: 404 });
    }

    // Invalidar caché
    await invalidateRolesCache();

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error in PATCH /api/roles:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await rateLimit(ip, 30, 60);
  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Has excedido el límite de solicitudes.' }),
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Bad Request', message: 'Role ID is required' }, { status: 400 });
    }

    const [deleted] = await db.delete(roles)
      .where(eq(roles.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Not Found', message: 'Role not found' }, { status: 404 });
    }

    // Invalidar caché
    await invalidateRolesCache();

    return NextResponse.json({ success: true, data: deleted });
  } catch (err: any) {
    console.error('Error in DELETE /api/roles:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}

