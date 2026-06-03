import { NextResponse } from 'next/server';
import { db } from '../../../core/db';
import { members } from '../../../core/db/schema';
import { eq, sql } from 'drizzle-orm';
import redisConnection from '../../../core/redis';
import { rateLimit } from '../../../backend/security/rateLimit';

const CACHE_PREFIX = 'cache:members:';
const CACHE_TTL = 300; // 5 minutos

async function invalidateMembersCache() {
  try {
    const keys = await redisConnection.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redisConnection.del(...keys);
    }
    // Invalidar también las estadísticas ya que los miembros cambiaron
    await redisConnection.del('cache:stats');
  } catch (err) {
    console.warn('Failed to invalidate Redis cache for members:', err);
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
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '100', 10));
    const offset = (page - 1) * limit;

    const cacheKey = `${CACHE_PREFIX}page:${page}:limit:${limit}`;

    // 1. Intentar leer de la caché de Redis
    try {
      const cached = await redisConnection.get(cacheKey);
      if (cached) {
        return NextResponse.json({ ...JSON.parse(cached), fromCache: true });
      }
    } catch (cacheErr) {
      console.warn('Redis Cache Read Failed for members:', cacheErr);
    }

    // 2. Consultar base de datos
    // Obtener total de registros
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(members);
    const total = countResult?.count || 0;

    // Obtener lista paginada
    const list = await db
      .select()
      .from(members)
      .orderBy(members.createdAt)
      .limit(limit)
      .offset(offset);

    const responseData = {
      success: true,
      data: list,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };

    // 3. Guardar en la caché de Redis
    try {
      await redisConnection.set(cacheKey, JSON.stringify(responseData), 'EX', CACHE_TTL);
    } catch (cacheErr) {
      console.warn('Redis Cache Write Failed for members:', cacheErr);
    }

    return NextResponse.json({ ...responseData, fromCache: false });
  } catch (err: any) {
    console.error('Error in GET /api/members:', err);
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
    const { name, email, role, avatarUrl } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Bad Request', message: 'Name and email are required' }, { status: 400 });
    }

    const [newMember] = await db.insert(members).values({
      name,
      email,
      role: role || 'viewer',
      avatarUrl: avatarUrl || null,
    }).returning();

    // Invalidar caché
    await invalidateMembersCache();

    return NextResponse.json({ success: true, data: newMember }, { status: 201 });
  } catch (err: any) {
    console.error('Error in POST /api/members:', err);
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
    const { id, name, email, role, avatarUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bad Request', message: 'Member ID is required' }, { status: 400 });
    }

    const [updated] = await db.update(members)
      .set({
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        updatedAt: new Date(),
      })
      .where(eq(members.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Not Found', message: 'Member not found' }, { status: 404 });
    }

    // Invalidar caché
    await invalidateMembersCache();

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error in PATCH /api/members:', err);
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
      return NextResponse.json({ error: 'Bad Request', message: 'Member ID is required' }, { status: 400 });
    }

    const [deleted] = await db.delete(members)
      .where(eq(members.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Not Found', message: 'Member not found' }, { status: 404 });
    }

    // Invalidar caché
    await invalidateMembersCache();

    return NextResponse.json({ success: true, data: deleted });
  } catch (err: any) {
    console.error('Error in DELETE /api/members:', err);
    return NextResponse.json({ error: 'Database Error', message: err.message }, { status: 500 });
  }
}


