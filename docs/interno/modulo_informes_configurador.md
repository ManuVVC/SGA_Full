# Módulo de Informes Configurables

## Resumen

El módulo de Informes Configurables reemplaza el sistema anterior basado en consultas SQL manuales almacenadas en un archivo JSON (`backend/data/informes.json`). El nuevo sistema permite a los administradores configurar informes de forma estructurada desde la interfaz, y a los usuarios consumirlos sin necesidad de conocimientos técnicos.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                        │
│                                                             │
│  Informes.jsx (Orquestador de pestañas)                     │
│  ├── VisorInforme.jsx        → Usuario consume informes     │
│  ├── ConfiguradorVistas.jsx  → Admin configura informes     │
│  ├── SQL Avanzado (legacy)   → Admin escribe SQL crudo      │
│  └── ProductividadOperadores → Sin cambios                  │
│                                                             │
│  FiltrosDinamicos.jsx → Componente compartido de filtros    │
└─────────────────────────────────────────────────────────────┘
                          │ adminApi (/admin)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Flask)                          │
│                                                             │
│  admin_routes.py                                            │
│  ├── /informes-config          (GET, POST)                  │
│  ├── /informes-config/<id>     (GET, PUT, DELETE)            │
│  ├── /informes-config/ejecutar (POST)                       │
│  ├── /informes-config/columnas (GET)                        │
│  ├── /informes-config/tablas   (GET)                        │
│  └── /informes-config/preferencias (GET, POST)              │
│                                                             │
│  informes_config_service.py → Lógica de negocio             │
│  informes_config_repo.py    → Acceso a Oracle               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORACLE                                    │
│                                                             │
│  SGA_INFORMES_CONFIG    → Definiciones de informes          │
│  SGA_INFORMES_USUARIO   → Preferencias por usuario          │
│  GSM.TMST_FILTROS       → Filtros guardados (existente)     │
│  GSM.TSYS_DEFINICIONCAMPOSFILTRO → Campos de filtro (exist.)│
└─────────────────────────────────────────────────────────────┘
```

## Tablas de Base de Datos

### SGA_INFORMES_CONFIG

| Campo | Tipo | Descripción |
|-------|------|-------------|
| ID | NUMBER PK | Identificador único (secuencia `SGA_INFORMES_CONFIG_SEQ`) |
| NOMBRE | VARCHAR2(100) | Nombre interno del informe |
| TITULO | VARCHAR2(200) | Título visible para el usuario |
| DESCRIPCION | VARCHAR2(500) | Texto descriptivo del informe |
| CATEGORIA | VARCHAR2(100) | Categoría (Stock, Movimientos, Albaranes, Pedidos, Operadores, Otros) |
| SQL_QUERY | CLOB | Consulta SQL. Soporta `{FILTROS_DINAMICOS}` |
| CODDEFFILTRO | NUMBER | Enlace con `GSM.TSYS_DEFINICIONCAMPOSFILTRO` |
| COLUMNAS_CONFIG | CLOB | JSON con configuración de columnas para AG Grid |
| ORDER_BY | VARCHAR2(500) | Cláusula ORDER BY por defecto |
| VISIBLE_USUARIOS | NUMBER(1) | 1=Visible, 0=Solo admin |
| FECHA_CREACION | DATE | Fecha de creación |
| FECHA_MODIFICACION | DATE | Última modificación |

### SGA_INFORMES_USUARIO

| Campo | Tipo | Descripción |
|-------|------|-------------|
| ID | NUMBER PK | Identificador único (secuencia `SGA_INFORMES_USUARIO_SEQ`) |
| ID_INFORME | NUMBER FK | Referencia a SGA_INFORMES_CONFIG |
| CODOPERADOR | NUMBER | Código del operador |
| COLUMNAS_VISIBLES | CLOB | JSON con campos visibles |
| ORDEN_COLUMNAS | CLOB | JSON con orden personalizado |
| FECHA_MODIFICACION | DATE | Última modificación |

## Endpoints API

| Método | Ruta | Descripción | Acceso |
|--------|------|-------------|--------|
| GET | `/admin/informes-config` | Lista informes (`?solo_visibles=1` para usuarios) | Todos |
| GET | `/admin/informes-config/<id>` | Detalle de un informe | Todos |
| POST | `/admin/informes-config` | Crear informe | Admin |
| PUT | `/admin/informes-config/<id>` | Actualizar informe | Admin |
| DELETE | `/admin/informes-config/<id>` | Eliminar informe | Admin |
| POST | `/admin/informes-config/ejecutar` | Ejecutar informe con filtros | Todos |
| GET | `/admin/informes-config/columnas?tabla=X` | Columnas de una tabla Oracle | Admin (LAN) |
| GET | `/admin/informes-config/tablas` | Tablas/vistas disponibles | Admin (LAN) |
| GET | `/admin/informes-config/preferencias` | Preferencias del usuario | Todos |
| POST | `/admin/informes-config/preferencias` | Guardar preferencias | Todos |

## Componentes Frontend

### Informes.jsx (Vista principal)
Orquesta 4 pestañas:
1. **Informes** → `<VisorInforme />` (pestaña por defecto)
2. **Configurador** → `<ConfiguradorVistas />` (solo admin)
3. **SQL Avanzado** → Modo legacy con SQL crudo (solo admin)
4. **Productividad** → `<ProductividadOperadores />` (sin cambios)

### VisorInforme.jsx
- Sidebar con informes agrupados por categoría
- Filtros dinámicos renderizados automáticamente
- AG Grid con resultados, exportación CSV, búsqueda rápida
- Props: `isAdmin: boolean`

### ConfiguradorVistas.jsx
- CRUD de informes
- Editor SQL, configuración de columnas (JSON), filtros
- Confirmación de eliminación inline (sin `window.confirm`)
- Props: `onInformeUpdated: () => void`

### FiltrosDinamicos.jsx
- Renderiza inputs según definición de campos Oracle
- Soporte para filtros guardados y personalizados
- Props: `coddeffiltro`, `onFiltroChange`, `onFiltroGuardadoSelect`, `isAdmin`

## Retrocompatibilidad

Los endpoints originales (`/admin/informes`, `/admin/informes/ejecutar`) siguen funcionando. El archivo `backend/data/informes.json` no se elimina. La pestaña "SQL Avanzado" mantiene toda la funcionalidad original.

## Despliegue

1. Ejecutar el script SQL en Oracle:
   ```sql
   @backend/scripts/create_informes_tables.sql
   ```
2. Reconstruir backend:
   ```bash
   docker compose -f docker-compose.yml --env-file .env.prod up -d --build --no-deps backend
   ```
3. Reconstruir frontend:
   ```bash
   docker compose -f docker-compose.yml --env-file .env.prod up -d --build --no-deps frontend
   ```
