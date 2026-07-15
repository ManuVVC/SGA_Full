# Monorepo SGA — Documentación Interna

## Estructura del Repositorio

```
SGA/
├── backend/              → API Flask (Python) + Oracle Instant Client
│   ├── app/              → Rutas, servicios, repositorios, utilidades
│   ├── Dockerfile        → Imagen Docker del backend (Python 3.11-slim + Oracle)
│   ├── requirements.txt
│   └── run.py
├── pda/                  → Frontend React (Vite) para terminales PDA
│   ├── src/
│   │   └── api/
│   │       └── apiService.js   → Cliente Axios con reintentos automáticos Wi-Fi
│   ├── Dockerfile        → Build multi-stage (Node build → Nginx serve)
│   └── nginx.conf        → Proxy inverso /api/* → backend
├── docker-compose.yml    → Orquestador de PRODUCCIÓN
├── docker-compose.dev.yml → Sobreescritura para DESARROLLO
├── .env.example          → Plantilla de variables de entorno
└── docs/interno/         → Esta documentación
```

---

## Comandos Habituales

### Desarrollo (hot-reload)
```bash
# Levanta el backend con Flask debug y el frontend con Vite dev server
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Frontend disponible en: http://localhost:5173
# Backend disponible en:  http://localhost:5000
```

### Producción
```bash
# Construye imágenes y levanta todos los servicios
docker compose up --build -d

# Frontend disponible en: http://localhost:80
# El proxy Nginx enruta /api/* al backend automáticamente
```

### Parar todos los servicios
```bash
docker compose down
```

### Ver logs en tiempo real
```bash
docker compose logs -f backend
docker compose logs -f pda
```

---

## Arquitectura de Red (Producción)

```
PDA (navegador)
    │
    ▼ :80
┌─────────────┐     /api/*      ┌──────────────┐
│  Nginx      │ ──────────────► │ Flask :5000  │
│  sga_pda    │                 │  sga_backend │
│             │ ◄─────────────  │              │
└─────────────┘                 └──────┬───────┘
      │                                │
      │ /  (ficheros estáticos)        │ Oracle DB (externo)
      ▼                                ▼
  React build                    python-oracledb
```

---

## Reintentos de Red en PDA (axios-retry)

El cliente Axios en `pda/src/api/apiService.js` está configurado para manejar
cortes momentáneos de Wi-Fi en almacenes con estanterías metálicas.

| Parámetro | Valor |
|---|---|
| Número de reintentos | 3 |
| Estrategia de delay | Backoff exponencial |
| Delay entre intentos | 1s → 2s → 4s |
| Timeout por petición | 8s |
| Condición de reintento | Error de red ó error 5xx |
| Errores NO reintentados | 4xx (EAN inválido, sin permisos…) |

El operario **no ve ningún mensaje de error** durante los reintentos silenciosos.
Solo se muestra el error rojo tras agotar los 3 intentos (~7s máximo).

---

## Migración desde los Repos Originales

El monorepo se construyó con `git subtree` para preservar el historial completo:

```bash
# Los commits originales de SGA_BACKEND están en backend/
# Los commits originales de SGA_PDA están en pda/
git log --oneline backend/  # Ver historial del backend
git log --oneline pda/      # Ver historial del frontend
```

Los repos originales `SGA_BACKEND` y `SGA_PDA` pueden eliminarse una vez
verificado el correcto funcionamiento del monorepo.

---

*Última actualización: 2026-07-15*
