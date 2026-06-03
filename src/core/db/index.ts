import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';

// Cargar cliente global en desarrollo para evitar fugas de conexiones (hot reload)
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const isDev = process.env.NODE_ENV !== 'production';

const client = globalForDb.conn ?? postgres(connectionString, { 
  prepare: false,
  idle_timeout: 10, // Cierra conexiones inactivas rápido (10s)
  max: isDev ? 1 : 4, // En desarrollo solo usar 1 conexión para evitar agotar el pool de Supabase
  connect_timeout: 10, // Tiempo de espera de conexión más corto para fallar rápido
});

if (isDev) globalForDb.conn = client;

export const db = drizzle(client, { schema });

// Inicializar el worker en segundo plano en el servidor para procesar la cola de BullMQ
if (typeof window === 'undefined') {
  import('../../backend/queue/worker')
    .then(() => console.log('[BullMQ] Transcription Worker iniciado con éxito y escuchando en Redis.'))
    .catch(err => console.error('[BullMQ] Error al iniciar el Transcription Worker:', err));
}


