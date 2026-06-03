import { Queue } from 'bullmq';
import redisConnection from '@/core/redis';

export const TRANSCRIPTION_QUEUE_NAME = 'meeting-transcription';

// Crear y exportar la cola
export const transcriptionQueue = new Queue(TRANSCRIPTION_QUEUE_NAME, {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3, // Intentar hasta 3 veces si falla (ej. error de rate limit en API)
    backoff: {
      type: 'exponential',
      delay: 5000, // Esperar 5s, 10s, 20s...
    },
    removeOnComplete: true, // Limpiar trabajos completados para ahorrar memoria en Redis
    removeOnFail: false, // Mantener los fallidos para depuración
  },
});
