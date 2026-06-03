import redisConnection from '../../core/redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Limitador de tasa rápido y atómico basado en Redis.
 * @param ip Dirección IP del cliente a evaluar.
 * @param limit Número máximo de peticiones permitidas en la ventana.
 * @param windowSeconds Tamaño de la ventana de tiempo en segundos.
 */
export async function rateLimit(
  ip: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const key = `ratelimit:${ip}`;
  
  // Usar operación incremental atómica de Redis
  const count = await redisConnection.incr(key);
  
  if (count === 1) {
    // Si es la primera solicitud en esta ventana, configurar tiempo de expiración
    await redisConnection.expire(key, windowSeconds);
  }
  
  const ttl = await redisConnection.ttl(key);
  
  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    reset: ttl > 0 ? ttl : windowSeconds,
  };
}
