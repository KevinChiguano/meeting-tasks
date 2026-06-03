# 🎙️ Aplicación: De Reuniones a Tareas Automáticas

Este sistema fullstack te permite subir archivos de audio/video de tus reuniones, transcribirlos automáticamente mediante Inteligencia Artificial y extraer tareas estructuradas con responsables y fechas límite, integrándose directamente con base de datos en tiempo real.

El proyecto está optimizado para ser escalable, sostenible en costos ($0 USD iniciales) y correr sobre un servidor dedicado usando **Next.js**, **pnpm**, **Supabase**, **Gemini 1.5 Flash** y colas asíncronas con **Redis + BullMQ**.

---

## 🛠️ Stack Tecnológico

- **Frontend & API**: Next.js (App Router, TypeScript, TailwindCSS)
- **Gestor de Paquetes**: pnpm
- **Base de Datos & Storage**: Supabase (PostgreSQL)
- **Motor de Inteligencia Artificial**: Google Gen AI SDK (Gemini 1.5 Flash)
- **Procesamiento Asíncrono**: BullMQ + Redis (Servidor local o VPS)

---

## 🚀 Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

1.  **Node.js** (v18.x o superior)
2.  **pnpm** (`npm install -g pnpm`)
3.  **Redis Server**: Ejecutándose en el puerto `6379`. Puedes levantarlo en un segundo con el archivo `docker-compose.yml` provisto:
    ```bash
    docker compose up -d
    ```
    _(Esto descargará e iniciará una instancia optimizada y persistente de Redis v7.2-alpine en segundo plano)._

---

## ⚙️ Configuración

1.  **Clonar y preparar variables de entorno:**
    Copia el archivo de ejemplo para crear tu configuración local:

    ```bash
    cp .env.example .env
    ```

2.  **Configurar las credenciales en el archivo `.env`:**
    - `NEXT_PUBLIC_SUPABASE_URL`: URL del endpoint de tu proyecto Supabase.
    - `SUPABASE_SERVICE_ROLE_KEY`: Llave de servicio (Service Role Key) para omitir RLS desde el servidor/workers.
    - `REDIS_HOST` y `REDIS_PORT`: Dirección y puerto de tu instancia de Redis (por defecto `127.0.0.1` y `6379`).
    - `GEMINI_API_KEY`: API Key obtenida gratis desde [Google AI Studio](https://aistudio.google.com/).

3.  **Instalar las dependencias:**
    ```bash
    pnpm install
    ```

---

## 🗄️ Base de Datos y ORM (Drizzle)

El sistema utiliza **Supabase (PostgreSQL)** como base de datos y **Drizzle ORM** para el mapeo relacional de objetos, migraciones y manipulación de datos desde TypeScript de manera óptima y ligera.

### 🔑 Requisito de Conexión Directa

Para poder ejecutar consultas robustas en el backend y gestionar las migraciones, Drizzle se conecta de forma directa a la base de datos PostgreSQL mediante el protocolo nativo (a través de TCP/SSL) usando la variable `DATABASE_URL` en tu `.env`.

### 🛠️ Comandos Útiles de Drizzle

Hemos configurado scripts de automatización en `package.json` para facilitar la gestión del esquema de base de datos:

1. **Crear o modificar esquemas (`src/core/db/schema.ts`):**
   Si realizas cambios en el esquema TypeScript (añadir campos, relaciones, etc.), puedes generar automáticamente el archivo de migración SQL correspondiente ejecutando:

   ```bash
   pnpm run db:generate
   ```

   _(Esto creará un nuevo script `.sql` en el directorio `./supabase/migrations/`)_.

2. **Aplicar cambios a Supabase:**
   Para subir e impactar directamente los cambios en tu base de datos de producción o desarrollo en Supabase:

   ```bash
   pnpm run db:push
   ```

3. **Drizzle Studio (Panel de Administración Visual):**
   Puedes explorar, filtrar, crear y editar registros de tus tablas `meetings` y `tasks` en una interfaz web sumamente fluida e intuitiva ejecutando:
   ```bash
   pnpm run db:studio
   ```
   _(Por defecto se levantará en [http://localhost:4983](http://localhost:4983))_.

---

## 💻 Ejecución en Desarrollo

Para ejecutar el sistema en tu entorno local, necesitas arrancar dos procesos en paralelo (o uno solo si estás validando el frontend):

### 1. Servidor de Next.js (Frontend & API Route Handlers)

Levanta la interfaz web y los endpoints API:

```bash
pnpm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### 2. Ejecutar el Worker en segundo plano (Procesamiento de Colas)

Los procesos pesados como la transcripción y el análisis por IA no deben bloquear el servidor de Next.js. BullMQ corre mediante un Worker en segundo plano.

Para desarrollo, puedes inicializar el worker ejecutando su script:

```bash
# Puedes crear un comando personalizado o ejecutarlo directamente con ts-node/tsx en tu pipeline
npx tsx src/queue/worker.ts
```

---

## 🏗️ Compilación y Despliegue (Producción)

Cuando estés listo para desplegar en tu propio servidor dedicado (VPS):

1.  **Compilar Next.js en modo Standalone:**
    ```bash
    pnpm run build
    ```
2.  **Arrancar la aplicación Next.js:**
    ```bash
    pnpm run start
    ```
3.  **Levantar el Worker en segundo plano (Daemon / PM2):**
    Para producción en un servidor dedicado, se recomienda gestionar el proceso del worker usando **PM2** para asegurar que siempre esté en línea:
    ```bash
    pm2 start src/queue/worker.ts --interpreter node -r ts-node/register --name "meeting-worker"
    ```

---

## 🔒 Seguridad y Manejo de Keys

Este proyecto es estrictamente **seguro**:

- Las llaves como `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y las credenciales de Redis se configuran en el servidor y **nunca se envían ni exponen al navegador**.
- El procesamiento de audio y las llamadas a la inteligencia artificial ocurren 100% de manera privada en el backend a través del worker de BullMQ.
