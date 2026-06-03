const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

// Cargar variables de entorno manualmente desde el archivo .env si no están presentes
const envPath = path.join(__dirname, '../../../.env');
if (!process.env.DATABASE_URL && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const connectionString = process.env.DATABASE_URL || '';
const sql = postgres(connectionString);

async function main() {
  console.log('Iniciando creación de la tabla projects en Supabase...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "description" text,
        "created_at" timestamp with time zone DEFAULT now()
      );
    `;
    console.log('¡Tabla projects creada con éxito!');
    process.exit(0);
  } catch (err) {
    console.error('Error al crear la tabla projects:', err);
    process.exit(1);
  }
}

main();
