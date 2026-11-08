# MinerTrack · Registro de equipos mineros

Aplicación full stack para registrar camiones, excavadoras y perforadoras, controlar su
horómetro y saber cuándo requieren mantenimiento. El frontend y el backend son
independientes, cada uno con su propia URL pública en Vercel, y todo se publica con un
único comando.

## URLs públicas

| Servicio | URL |
| --- | --- |
| Frontend | https://mining-equipment-web-two.vercel.app |
| Backend | https://mining-equipment-api.vercel.app |
| Health check | https://mining-equipment-api.vercel.app/health |

> Vercel asigna un sufijo (`-two`) cuando el dominio por defecto ya está ocupado.
> El script detecta la URL real después de publicar y actualiza CORS automáticamente.

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS 4.
- **Backend:** Next.js 15 (App Router, route handlers) + TypeScript.
- **Base de datos:** PostgreSQL (Neon en producción) + Prisma ORM.
- **Validación:** Zod.
- **Deploy:** Vercel CLI, script `./deploy.sh`.
- **Calidad:** Vitest, Testing Library, GitHub Actions, Docker Compose.

## Estructura

```text
.
├── apps/
│   ├── api/                  # Backend Next.js
│   │   ├── app/              # /health y /api/*
│   │   ├── prisma/           # Schema y migraciones versionadas
│   │   ├── src/lib/          # Prisma, reglas de negocio, validación, errores
│   │   ├── tests/            # Unitarias e integración
│   │   └── Dockerfile
│   └── web/                  # Frontend React
│       ├── src/components/
│       ├── src/lib/
│       ├── tests en src/
│       └── Dockerfile
├── deploy.sh                 # Comando único de despliegue
├── docker-compose.yml
├── .github/workflows/        # CI y despliegue manual
├── .env.example              # Plantilla de variables (sin secretos)
└── Makefile
```

## Reglas de negocio

- Tipos de equipo e intervalos de mantenimiento:
  - `TRUCK` / Camión: **250 h**
  - `EXCAVATOR` / Excavadora: **500 h**
  - `DRILL` / Perforadora: **200 h**
- El horómetro es acumulativo y **no puede retroceder**.
- Un equipo **requiere mantenimiento** cuando:
  `currentHours >= lastMaintenanceHours + intervalHours`.
- Al registrar un mantenimiento:
  - se guarda un registro en el historial con horas, notas y fecha;
  - el ciclo se reinicia tomando las horas del servicio como nuevo punto de partida;
  - el próximo servicio queda en `horasDelServicio + intervalo`.
- El código es único, se normaliza a mayúsculas y acepta letras, números y guiones
  (`CAM-001`, `EXC-014`, `PER-003`).
- Eliminar un equipo elimina en cascada su historial, previa confirmación en la UI.

## Modelo de datos

`Equipment`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | string (cuid) | Identificador |
| `code` | string único | Código del equipo |
| `type` | enum | `TRUCK`, `EXCAVATOR`, `DRILL` |
| `currentHours` | float | Horómetro actual |
| `lastMaintenanceHours` | float | Horómetro del último servicio |
| `lastMaintenanceAt` | datetime? | Fecha del último servicio |
| `createdAt` / `updatedAt` | datetime | Auditoría |

`Maintenance`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | string (cuid) | Identificador |
| `equipmentId` | string FK | Equipo, con borrado en cascada |
| `hoursAtService` | float | Horómetro al momento del servicio |
| `notes` | string? | Notas opcionales |
| `performedAt` | datetime | Fecha del servicio |
| `createdAt` | datetime | Fecha de creación del registro |

## API REST

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Estado del servicio y de PostgreSQL |
| `GET` | `/api/equipments` | Lista; acepta `search`, `type`, `status=due\|ok` |
| `POST` | `/api/equipments` | Crea un equipo |
| `GET` | `/api/equipments/:id` | Detalle con historial |
| `PATCH` | `/api/equipments/:id` | Edita código, tipo u horómetro |
| `DELETE` | `/api/equipments/:id` | Elimina equipo e historial |
| `GET` | `/api/equipments/:id/maintenances` | Historial de mantenimiento |
| `POST` | `/api/equipments/:id/maintenances` | Registra servicio y reinicia ciclo |
| `GET` | `/api/equipment-types` | Tipos e intervalos configurados |

Los errores usan JSON consistente:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revisa los datos enviados.",
    "details": { "code": "Usa solo letras, números y guiones." }
  }
}
```

Códigos HTTP usados: `200`, `201`, `204`, `400`, `404`, `409`, `500`, `503`.

CORS se configura con `WEB_ORIGIN` (producción) y permite además `localhost:5173` y
`localhost:8080` para desarrollo.

## Desarrollo local

### Requisitos

- Node.js **>= 20.19**
- npm 10+
- PostgreSQL 14+ (o Docker)

### Opción A: todo con Docker Compose

```bash
docker compose up --build
```

- Frontend: <http://localhost:8080>
- Backend: <http://localhost:3001>
- Health: <http://localhost:3001/health>
- PostgreSQL: `localhost:5433` (`mining` / `mining`), por si ya tienes otro PostgreSQL local.

El contenedor del backend aplica las migraciones al iniciar.

### Opción B: manual

1. Instala dependencias:

```bash
npm run install:all
```

2. Crea una base de datos local y configura el backend:

```bash
createdb mining
cp apps/api/.env.example apps/api/.env
# Edita DATABASE_URL y DIRECT_URL si tu usuario/puerto son distintos.
```

3. Aplica migraciones:

```bash
npm run db:migrate:deploy
```

4. Arranca ambos servicios:

```bash
npm run dev
```

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:3001>

También puedes ejecutar `make dev`.

> Los tests de integración rechazan ejecutarse sin `TEST_DATABASE_URL`, para evitar
> limpiar accidentalmente una base de producción.

## Variables de entorno

### Backend (`apps/api`)

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión PostgreSQL para runtime (pooler en Neon) |
| `DIRECT_URL` | Sí | Conexión directa para migraciones (local) |
| `WEB_ORIGIN` | Producción | Origen(es) permitidos por CORS, separados por coma |

### Frontend (`apps/web`)

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_API_URL` | Sí | URL pública del backend (se incrusta en build) |

### Despliegue (`.env.deploy`)

Parte de `.env.example`; el archivo real está en `.gitignore` y **nunca** debe subirse.

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Cadena con pooler de Neon para runtime |
| `DIRECT_URL` | Opcional; si se omite se deriva de `DATABASE_URL` quitando `-pooler` |
| `VERCEL_TOKEN` | Token personal de Vercel |
| `VERCEL_SCOPE` | Usuario o equipo de Vercel |
| `API_PROJECT_NAME` | Nombre del proyecto backend (por defecto `mining-equipment-api`) |
| `WEB_PROJECT_NAME` | Nombre del proyecto frontend (por defecto `mining-equipment-web`) |
| `API_PUBLIC_URL` | Opcional; si se omite se descubre o se usa el dominio por defecto |
| `WEB_PUBLIC_URL` | Opcional; si se omite se descubre o se usa el dominio por defecto |

## Despliegue con un comando

### Preparación (una sola vez)

1. Crea un proyecto en [Neon](https://neon.tech) y copia su cadena **pooled**.
2. Crea un token en <https://vercel.com/account/tokens>.
3. Crea el archivo de entorno:

```bash
cp .env.example .env.deploy
# Completa DATABASE_URL, VERCEL_TOKEN y VERCEL_SCOPE.
```

`DIRECT_URL` es opcional: si la dejas vacía, `deploy.sh` la obtiene quitando
`-pooler` del host de `DATABASE_URL`, como recomienda Neon.

Los proyectos de Vercel se crean automáticamente si no existen. Los nombres deben ser
únicos dentro de tu cuenta/equipo. Si usas dominios personalizados, define
`API_PUBLIC_URL` y `WEB_PUBLIC_URL`. Si Vercel asigna un dominio con sufijo, el script
usa la URL real del despliegue, sincroniza `VITE_API_URL` y `WEB_ORIGIN`, y reaplica CORS.

### Ejecutar

```bash
./deploy.sh
# o
make deploy
# o
npm run deploy
```

El script es idempotente y hace lo siguiente:

1. **Preflight:** valida Node, npm, git, curl, Vercel CLI, token, scope, variables y
   conectividad con PostgreSQL. Falla antes de publicar si algo falta.
2. **Dependencias:** `npm ci` en backend y frontend.
3. **Calidad:** typecheck y tests unitarios de ambas apps; build local de ambas.
4. **Migraciones:** `prisma migrate deploy` (no destructivo; repetible).
5. **Vercel:** crea/víncula los dos proyectos y sincroniza variables de entorno de
   producción.
6. **Backend:** publica, espera `/health` con reintentos y verifica CORS.
7. **Frontend:** publica y verifica que responda el HTML de la SPA.
8. **Verificación final:** comprueba ambos servicios e imprime las URLs.

**Rollback:** antes de publicar se guarda el deployment productivo anterior. Si el nuevo
backend o frontend no pasa su verificación, se intenta `vercel rollback` al deployment
previo. Si no existe uno, se informa y el script termina con código distinto de 0.

**Idempotencia:** volver a ejecutar el script no borra datos, no reinicia la base de datos,
las migraciones ya aplicadas se omiten y cada ejecución crea un nuevo deployment de
producción.

**Fallo seguro:** cualquier paso falla con un mensaje claro y código de salida ≠ 0. Las
migraciones se aplican antes de publicar; si fallan, no se publica ningún servicio.

### GitHub Actions

- `.github/workflows/ci.yml`: typecheck, tests unitarios, tests de integración con
  PostgreSQL y build en cada push/PR.
- `.github/workflows/deploy.yml`: despliegue manual (`workflow_dispatch`). Configura los
  mismos secrets en **Settings → Secrets and variables → Actions**:
  `DATABASE_URL`, `VERCEL_TOKEN`, `VERCEL_SCOPE`, `API_PROJECT_NAME`,
  `WEB_PROJECT_NAME`, `API_PUBLIC_URL`, `WEB_PUBLIC_URL`. `DIRECT_URL` es opcional.

## Pruebas

```bash
npm test                    # Unitarias de backend y frontend
npm run test:integration    # Integración contra TEST_DATABASE_URL
npm run typecheck
npm run build
```

Cobertura de pruebas:

- Reglas de mantenimiento, límites, intervalo, horas vencidas y reinicio de ciclo.
- Validación de códigos, tipos, horas y notas.
- CRUD completo, filtros, código duplicado, CORS implícito en integración y mantenimiento.
- Utilidades de formato del frontend y badge de estado.

## Docker (bonus)

```bash
docker compose up --build
# Frontend: http://localhost:8080
# Backend:  http://localhost:3001
```

Servicios: `db` (PostgreSQL 16), `api` (Next.js + migraciones) y `web` (build de Vite
servido con nginx). Los healthchecks de Compose esperan a que cada servicio esté listo.

## Decisiones y límites

- El backend usa route handlers de Next.js en runtime Node.js porque Prisma no corre en
  Edge.
- El frontend es una SPA de Vite: simple de desplegar y de explicar, sin router porque la
  aplicación tiene una sola vista.
- Los intervalos están centralizados en el dominio del backend y se exponen mediante
  `/api/equipment-types`; el frontend usa esos valores con un fallback local.
- El script usa `npx vercel@65.12.1` fijado, así no requiere instalar la CLI globalmente.
- Neon ofrece conexión pooled para runtime y directa para migraciones; Prisma usa
  `directUrl` para `migrate deploy`.
- El rollback de Vercel revierte el código, no la base de datos. Las migraciones deben ser
  compatibles hacia atrás para permitir rollbacks seguros.

## Uso de IA

Este proyecto fue construido con asistencia de **opencode** (agente de IA en terminal)
para scaffolding, implementación, pruebas, Docker, CI y documentación. Todo el código
fue revisado y verificado localmente (typecheck, tests, builds y pruebas de la API contra
PostgreSQL). El autor puede explicar cada decisión técnica y el flujo de despliegue.

## Comandos útiles

| Comando | Acción |
| --- | --- |
| `npm run install:all` | Instala dependencias de ambas apps |
| `npm run dev` | Backend + frontend en desarrollo |
| `npm test` | Tests unitarios |
| `npm run test:integration` | Tests de integración |
| `npm run typecheck` | TypeScript estricto en ambas apps |
| `npm run build` | Build de producción local |
| `npm run db:migrate:deploy` | Aplica migraciones |
| `./deploy.sh` | Despliegue completo en Vercel |
| `docker compose up --build` | Stack completo local |
