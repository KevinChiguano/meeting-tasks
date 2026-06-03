import { NextResponse } from 'next/server';
import { db } from '../../../core/db';
import { meetings, tasks } from '../../../core/db/schema';
import redisConnection from '../../../core/redis';
import { sql } from 'drizzle-orm';

const CACHE_KEY = 'cache:stats';
const CACHE_TTL = 60; // Cache por 60 segundos (1 minuto)

export async function GET() {
  try {
    // 1. Intentar obtener datos de la caché de Redis
    try {
      const cachedData = await redisConnection.get(CACHE_KEY);
      if (cachedData) {
        return NextResponse.json({
          success: true,
          data: JSON.parse(cachedData),
          fromCache: true
        });
      }
    } catch (cacheErr) {
      console.warn('Redis Cache Read Failed for stats:', cacheErr);
    }

    // 2. Probar conectividad real con Redis Cache
    let redisStatus = 'disconnected';
    let redisInfo = 'No disponible';
    try {
      const pong = await redisConnection.ping();
      if (pong === 'PONG') {
        redisStatus = 'operational';
        redisInfo = 'Conectado de forma activa';
      }
    } catch (err: any) {
      console.warn('Redis connection failed in API stats:', err.message);
    }

    // 3. Conteo real de base de datos Supabase
    const [meetingsResult] = await db.select({ count: sql<number>`count(*)` }).from(meetings);
    const [tasksResult] = await db.select({ count: sql<number>`count(*)` }).from(tasks);
    const [completedTasksResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(sql`status = 'completed'`);
    const [completedMeetingsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(meetings)
      .where(sql`status = 'completed'`);
    
    const mCount = Number(meetingsResult?.count || 0);
    const tCount = Number(tasksResult?.count || 0);
    const cCount = Number(completedTasksResult?.count || 0);
    const compMCount = Number(completedMeetingsResult?.count || 0);
    const totalRecords = mCount + tCount;

    // Límite del plan gratuito / pro
    const maxFreeRecords = 500;
    const dbUsagePercentage = Math.min(Math.round((totalRecords / maxFreeRecords) * 100), 100);

    // 4. Consumo mensual de API (Gemini / Transcripciones)
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const [monthlyResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(meetings)
      .where(sql`created_at >= ${firstDayOfMonth.toISOString()}`);

    const monthlyCount = Number(monthlyResult?.count || 0);
    const monthlyLimit = 100; // Limite de reuniones por mes
    const apiUsagePercentage = Math.min(Math.round((monthlyCount / monthlyLimit) * 100), 100);

    const responseData = {
      redis: {
        status: redisStatus,
        info: redisInfo,
        used: '1.2 GB', // mock de consumo de RAM
        total: '10 GB'
      },
      supabase: {
        status: 'connected',
        meetingsCount: mCount,
        completedMeetingsCount: compMCount,
        tasksCount: tCount,
        completedTasksCount: cCount,
        totalRecords,
        usagePercentage: dbUsagePercentage
      },
      apiLimits: {
        used: monthlyCount,
        total: monthlyLimit,
        usagePercentage: apiUsagePercentage
      }
    };

    // 5. Guardar en la caché de Redis
    try {
      await redisConnection.set(CACHE_KEY, JSON.stringify(responseData), 'EX', CACHE_TTL);
    } catch (cacheErr) {
      console.warn('Redis Cache Write Failed for stats:', cacheErr);
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      fromCache: false
    });
  } catch (err: any) {
    console.error('Error in GET /api/stats:', err);
    return NextResponse.json({ error: 'Stats Error', message: err.message }, { status: 500 });
  }
}

