# 🚀 Guía Completa de Despliegue en VPS (Next.js + PM2 + Redis + Nginx + SSL + GitHub Actions)

Esta guía documenta paso a paso el proceso de despliegue en producción de la aplicación **Meeting Tasks**, las decisiones de arquitectura tomadas, comandos útiles, precauciones y solución de errores comunes.

---

## 🏗️ Arquitectura del Despliegue

La aplicación se compone de:
1. **Frontend y API Route Handlers (Next.js)** corriendo localmente en el puerto `3002`.
2. **Worker en segundo plano (BullMQ + tsx)** encargado de procesar la transcripción y extracción por IA.
3. **Servidor Redis (Docker)** escuchando en el puerto local `6379`.
4. **Nginx** actuando como proxy inverso, redirigiendo el tráfico seguro del puerto `80/443` a la aplicación en el puerto `3002`.
5. **Certbot (Let's Encrypt)** para gestionar el certificado SSL HTTPS de forma gratuita y automática.
6. **CI/CD (GitHub Actions)** para automatizar la integración y despliegue continuo cada vez que se hace push a `main`.

---

## 📋 Paso a Paso del Despliegue

### Paso 1: Configurar DNS en Cloudflare
Antes de configurar el servidor, debes indicarle al dominio a dónde apuntar.
1. Entra a tu cuenta de Cloudflare y ve a la sección **DNS**.
2. Añade un nuevo registro tipo **A**:
   - **Type**: `A`
   - **Name**: `meetings` (creará el subdominio `meetings.kpccdev.com`).
   - **IPv4 Address**: La IP pública de tu VPS (ej. `84.46.253.42`).
   - **Proxy Status**: Activo (Nube naranja - *Proxied*).

---

### Paso 2: Preparación del VPS y Permisos del Usuario
Es una mala práctica correr tus aplicaciones Node.js o el pipeline de despliegue continuo como usuario `root`. Por ello se utiliza un usuario con privilegios limitados (ej. `deploy`).

1. **Crear la carpeta del proyecto en el servidor:**
   ```bash
   mkdir -p /var/www/meeting-tasks
   ```
2. **Clonar el repositorio dentro de la carpeta:**
   ```bash
   cd /var/www/
   git clone https://github.com/KevinChiguano/meeting-tasks.git
   ```
3. **Mover la propiedad al usuario `deploy`:**
   Si clonaste como `root`, debes transferir la propiedad al usuario que usará GitHub Actions:
   ```bash
   chown -R deploy:deploy /var/www/meeting-tasks
   ```

---

### Paso 3: Configurar las Variables de Entorno (`.env`)
Crea el archivo `.env` en la raíz de tu proyecto `/var/www/meeting-tasks/` con tus credenciales de producción:

```env
# Configuración del servidor y base de datos
PORT=3002
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"

# Configuración de Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=1 # Usamos DB 1 para no colisionar con otros proyectos en DB 0

# IA
GEMINI_API_KEY=tu_gemini_api_key
```

> [!NOTE]
> Al dejar `REDIS_PASSWORD` vacío, se asume que tu Redis local en Docker no tiene contraseña. Al especificar `REDIS_DB=1`, aislamos los datos de este proyecto de otros que usen el mismo contenedor en la base de datos por defecto (`0`).

---

### Paso 4: Proxy Inverso con Nginx
Nginx recibe las conexiones en los puertos web estándar y las delega internamente al puerto `3002`.

1. **Crear archivo de configuración:**
   ```bash
   sudo nano /etc/nginx/sites-available/meetings.kpccdev.com
   ```
2. **Pegar configuración básica de proxy inverso:**
   ```nginx
   server {
       listen 80;
       server_name meetings.kpccdev.com;

       location / {
           proxy_pass http://127.0.0.1:3002;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. **Habilitar el sitio y reiniciar Nginx:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/meetings.kpccdev.com /etc/nginx/sites-enabled/
   sudo nginx -t  # Verificar que la sintaxis esté correcta
   sudo systemctl restart nginx
   ```

---

### Paso 5: Habilitar HTTPS con Certbot (SSL)
Consigue que la conexión sea cifrada con un certificado SSL válido.
```bash
sudo certbot --nginx -d meetings.kpccdev.com
```
*Sigue las instrucciones en pantalla, selecciona la opción para redirigir todo el tráfico HTTP a HTTPS de manera automática.*

---

### Paso 6: Configurar e iniciar PM2
PM2 mantiene los procesos Node.js y TypeScript vivos en segundo plano.

1. **Iniciar la aplicación Next.js:**
   ```bash
   pm2 start npm --name "meeting-app" -- run start -- -p 3002
   ```
2. **Iniciar el Worker utilizando el ejecutable local de `tsx` provisto por pnpm:**
   ```bash
   pm2 start pnpm --name "meeting-worker" -- exec tsx src/backend/queue/worker.ts
   ```
3. **Guardar el listado actual en PM2:**
   *(Esto asegura que si el VPS se reinicia, ambos procesos se levanten solos).*
   ```bash
   pm2 save
   ```

---

## 🛠️ GitHub Actions (CI/CD Automático)

El archivo de configuración de GitHub Actions en tu repositorio se ubica en `.github/workflows/deploy.yml`.

### Secretos requeridos en el repositorio de GitHub:
Ve a **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:
* `SSH_PRIVATE_KEY`: Tu clave SSH privada.
* `SERVER_IP`: La IP de tu servidor (`84.46.253.42`).
* `SERVER_USER`: El usuario del servidor configurado (`deploy`).

---

## ⚠️ Precauciones y Errores Comunes

### 1. El Puerto 3002 ya está en uso (`EADDRINUSE`)
* **Causa:** Hay un proceso de Node.js huérfano (zombie) corriendo fuera de PM2 que está ocupando el puerto.
* **Solución:** Fuerza la terminación del proceso con:
  ```bash
  kill -9 $(lsof -t -i:3002) 2>/dev/null || fuser -k 3002/tcp 2>/dev/null || true
  ```

### 2. Conflicto de Permisos (`EACCES: permission denied, unlink ...`)
* **Causa:** Se ejecutaron comandos como `root` (ej. `pnpm install`) dentro de la carpeta del proyecto, haciendo que el usuario `deploy` pierda la facultad de escribir o borrar en `node_modules`.
* **Solución:** Ejecuta esto en tu VPS como **`root`** para limpiar y devolver la propiedad a `deploy`:
  ```bash
  rm -rf /var/www/meeting-tasks/node_modules
  chown -R deploy:deploy /var/www/meeting-tasks
  ```
  *Regla de Oro:* Nunca ejecutes comandos de instalación como `root` en la carpeta del proyecto.

### 3. El comando `tsx` no es encontrado (`Command "tsx" not found`)
* **Causa:**
  - `tsx` no está instalado globalmente en el VPS.
  - O bien `pnpm install` se ejecutó asumiendo `NODE_ENV=production`, omitiendo la instalación de `devDependencies` (donde reside `tsx`).
* **Solución:** 
  1. Forzar la instalación de dependencias de desarrollo en el despliegue con:
     ```bash
     pnpm install --frozen-lockfile --prod=false
     ```
  2. Arrancar el worker usando `pnpm exec tsx` o la ruta local al ejecutable:
     ```bash
     pm2 start pnpm --name "meeting-worker" -- exec tsx src/backend/queue/worker.ts
     ```

### 4. Lockfile desactualizado (`ERR_PNPM_OUTDATED_LOCKFILE`)
* **Causa:** Se modificó manualmente el archivo `package.json` en local pero no se ejecutó `pnpm install` para generar la firma correcta en `pnpm-lock.yaml` antes de hacer el push.
* **Solución:** Corre `pnpm install` de forma local, haz commit del archivo `pnpm-lock.yaml` generado y súbelo.

---

## 🔍 Comandos de Diagnóstico Útiles

- **Ver estado general de tus apps:** `pm2 status`
- **Ver logs en vivo de una app específica:** `pm2 logs meeting-app` o `pm2 logs meeting-worker`
- **Reiniciar una app:** `pm2 restart meeting-app`
- **Monitorear recursos (CPU/RAM):** `pm2 monit`
- **Ver qué puertos están escuchando en el VPS:** `ss -tulnp | grep LISTEN`
- **Verificar que Redis Docker esté corriendo:** `docker ps | grep redis`
- **Acceder a la consola de Redis en Docker:** `docker exec -it inventario_redis_1 redis-cli` (luego usa `INFO keyspace` para ver el estado de las DBs).
