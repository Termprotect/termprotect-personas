# Guía de despliegue — Termprotect Gestión de Personas

Esta guía te explica cómo poner la app en marcha desde cero.
Sigue los pasos en orden. Cada uno te explica exactamente qué hacer y dónde.

---

## Antes de empezar — Lo que necesitas

- Una cuenta en **Supabase** (ya la tienes): https://supabase.com
- Una cuenta en **Vercel** (ya la tienes): https://vercel.com
- Una cuenta en **GitHub** (gratis): https://github.com
- El programa **Node.js** instalado en tu ordenador: https://nodejs.org (versión 18 o superior)
- El programa **Git** instalado: https://git-scm.com

---

## PASO 1 — Subir el código a GitHub

1. Abre la carpeta del proyecto `termprotect-personas` en tu ordenador.
2. Abre una terminal (en Mac: Terminal; en Windows: PowerShell o Símbolo del sistema).
3. Navega hasta la carpeta del proyecto:
   ```
   cd ruta/a/termprotect-personas
   ```
4. Ejecuta estos comandos uno a uno:
   ```bash
   git init
   git add .
   git commit -m "Primer commit — Setup inicial"
   ```
5. Ve a GitHub → New repository → Nómbralo `termprotect-personas` → Create repository.
6. Sigue las instrucciones que te da GitHub para subir el código (section "push an existing repository").

---

## PASO 2 — Crear el proyecto en Supabase

1. Ve a https://supabase.com y entra con tu cuenta.
2. Haz clic en **New Project**.
3. Configura:
   - **Name**: `termprotect-personas`
   - **Database Password**: elige una contraseña fuerte y guárdala (la necesitarás después).
   - **Region**: `West EU (Ireland)` — más cercano a España.
4. Espera unos minutos a que se cree el proyecto.
5. Una vez creado, ve a **Settings → Database** y copia las siguientes URLs:
   - **Connection string (Mode: Transaction)** → esta es tu `DATABASE_URL`
   - **Connection string (Mode: Session)** → esta es tu `DIRECT_URL`

   Ambas URLs tienen el formato:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:XXXX/postgres
   ```

---

## PASO 3 — Configurar las variables de entorno en local

1. En la carpeta del proyecto, copia el archivo de ejemplo:
   ```bash
   cp .env.example .env.local
   ```
2. Abre `.env.local` con cualquier editor de texto (Bloc de notas, VS Code, etc.).
3. Rellena los valores:

   ```
   DATABASE_URL="postgresql://..." ← pega la Connection string (Transaction)
   DIRECT_URL="postgresql://..."   ← pega la Connection string (Session)
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="..."           ← genera esto con el paso 3b
   NEXT_PUBLIC_SUPABASE_URL="https://[tu-project-ref].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="..."  ← Settings → API → anon public
   SUPABASE_SERVICE_ROLE_KEY="..."      ← Settings → API → service_role
   ```

   **Cómo generar NEXTAUTH_SECRET** (en la terminal):
   ```bash
   openssl rand -base64 32
   ```
   Copia el resultado y pégalo en `NEXTAUTH_SECRET`.

---

## PASO 4 — Crear las tablas en la base de datos

Con el proyecto configurado, crea las tablas ejecutando:

```bash
# Instala las dependencias del proyecto
npm install

# Crea las tablas en Supabase
npx prisma db push
```

Verás en la terminal algo como:
```
✓ Generated Prisma Client
✓ Your database is now in sync with your Prisma schema.
```

---

## PASO 5 — Crear los datos iniciales (sedes + admin)

```bash
npm run db:seed
```

Verás:
```
🌱 Iniciando seed...
✅ Sedes creadas: Madrid, Barcelona, Valencia, Málaga
✅ Admin creado: documento=ADMIN00000, contraseña temporal: Admin2024!
✅ Usuario RRHH creado: documento=RRHH000000, contraseña temporal: Rrhh2024!
🌱 Seed completado correctamente.
```

---

## PASO 6 — Probar la app en local

```bash
npm run dev
```

Abre en el navegador: http://localhost:3000

Deberías ver la pantalla de login. Prueba con:
- **Documento**: `ADMIN00000`
- **Contraseña**: `Admin2024!`

Te pedirá cambiar la contraseña. Después verás el dashboard.

---

## PASO 7 — Desplegar en Vercel

1. Ve a https://vercel.com y entra con tu cuenta.
2. Haz clic en **Add New → Project**.
3. Conecta tu repositorio de GitHub (`termprotect-personas`).
4. En la sección **Environment Variables**, añade TODAS las variables de `.env.local`
   (las mismas, pero con `NEXTAUTH_URL` apuntando a tu dominio de Vercel:
   `https://termprotect-personas.vercel.app`).
5. Haz clic en **Deploy**.

Vercel construirá y publicará la app automáticamente.
Cada vez que hagas un cambio y lo subas a GitHub, Vercel lo desplegará solo.

---

## PASO 8 — Primeros pasos tras el despliegue

1. Entra a la app con el usuario Admin.
2. Ve a **Configuración → Sedes** y revisa que los días de vacaciones por convenio son correctos.
3. Ve a **Configuración → Calendarios** y añade los festivos de este año para cada sede.
4. Crea los empleados de RRHH reales y elimina los usuarios de ejemplo del seed.
5. Empieza a dar de alta empleados desde el módulo **Empleados → Nuevo empleado**.

---

## Preguntas frecuentes

**¿Qué es una "terminal"?**
Una ventana donde escribes comandos de texto. En Mac se llama Terminal (búscalo en Spotlight). En Windows se llama PowerShell o Símbolo del sistema.

**¿Cómo ejecuto un comando?**
Lo escribes en la terminal y pulsas Enter.

**¿Qué pasa si hay un error?**
Comparte el mensaje de error exacto conmigo y lo solucionamos.

**¿Puedo perder los datos?**
No, los datos están en Supabase, no en tu ordenador. Si borras el proyecto de Vercel, los datos siguen en Supabase.

**¿Cómo actualizo la app cuando hagamos cambios?**
Súbelo a GitHub y Vercel lo desplegará automáticamente. Lo hacemos juntos cada vez.
