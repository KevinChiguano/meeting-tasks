import { db } from './index';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Iniciando creación de la tabla projects en Supabase...');
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "description" text,
        "created_at" timestamp with time zone DEFAULT now()
      );
    `);
    console.log('¡Tabla projects creada con éxito!');
    process.exit(0);
  } catch (err: any) {
    console.error('Error al crear la tabla projects:', err);
    process.exit(1);
  }
}

main();
