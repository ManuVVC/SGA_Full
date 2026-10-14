# Manual Operativo y Metodología de Agentes (SGA)

Este documento centraliza la metodología de trabajo asistido por IA, los roles especializados y las directrices técnicas obligatorias del entorno de desarrollo para el proyecto SGA, con el objetivo de garantizar la estabilidad del monorepo y evitar conflictos entre entornos.

## 1. Agentes Especializados y Método de Trabajo

El desarrollo, refactorización y mantenimiento del proyecto SGA se orquesta a través de cuatro roles (subagentes) especializados que operan de forma concurrente o iterativa:

1. **Arquitecto de Software (`arquitecto_software`)**:
   - **Rol**: Responsable de la capa de negocio (`app/services`).
   - **Misión**: Aplicar principios Clean Code, SOLID, DRY y KISS.
   - **Tareas**: Refactorización, tipado fuerte (`typing`), unificación de flujos, y blindaje del sistema de logs (`logger.exception`).

2. **Ingeniero de QA (`qa_engineer`)**:
   - **Rol**: Especialista en testing automatizado.
   - **Misión**: Garantizar que todo nuevo código esté cubierto.
   - **Tareas**: Escribir pruebas unitarias (`pytest`) aislando la capa de datos e integraciones externas mediante `unittest.mock`.

3. **Technical Writer (`technical_writer`)**:
   - **Rol**: Documentador técnico y funcional.
   - **Misión**: Mantener `docs/interno/` actualizado y explicar el porqué del código.
   - **Tareas**: Generar manuales (Dev y Usuario) en Markdown, y añadir Docstrings o comentarios estratégicos en lógica de negocio compleja.

4. **Arquitecto de Base de Datos (`db_architect`)**:
   - **Rol**: "Portero" de la capa de persistencia (`app/repositories`).
   - **Misión**: Rendimiento, abstracción e integridad.
   - **Tareas**: Refactorizar repositorios (patrón DAO), prevenir problemas de "N+1 queries", garantizar cumplimiento ACID mediante transacciones robustas (mismo bloque de conexión) y blindar contra Inyección SQL. También recomienda creación de índices.

### Flujo de Trabajo Recomendado
1. Seleccionar un lote de módulos/archivos (ej. 2 a 4 archivos) para no sobrecargar el contexto.
2. Despachar a los agentes correspondientes en paralelo.
3. El Arquitecto de Software o DB sobrescriben los archivos con el código refactorizado.
4. Se validan las pruebas de QA.
5. Se compila y reinicia el entorno Docker de desarrollo para pruebas de integración.

---

## 2. Entornos Docker: Prevención de Conflictos

El servidor anfitrión corre dos entornos simultáneos (Producción y Desarrollo). **Es un error crítico arrancar contenedores sin especificar su archivo de entorno correspondiente**, ya que Docker utilizará los puertos y variables por defecto, provocando una colisión (ej: `puerto 5000 en uso`) e impidiendo la conexión a la base de datos correcta.

### ⚠️ Reglas de Oro de Docker Compose
- **Nunca ejecutar** `docker compose up` a secas.
- **Siempre inyectar el archivo `.env`** mediante el flag `--env-file`. Esto asegura que Docker asigne un nombre de red aislado (`COMPOSE_PROJECT_NAME`) y se mapeen los puertos correctos.

### Entorno de DESARROLLO
Levanta el código en caliente (Vite hot-reload y Flask debug) y ataca a la BD Oracle de Desarrollo.
* **Comando de Arranque**: 
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev up -d --build
  ```
* **Puertos de Dev (Aislados)**:
  - Backend: `5001` (interno `5000`)
  - PDA: `5174` (interno `5173`)
  - Frontend/Backoffice: `5176` (interno `5175`)
* **Nombre de Proyecto Compose**: `sga_dev`

### Entorno de PRODUCCIÓN
Levanta el código compilado (Nginx y Gunicorn/Waitress) y ataca a la BD Oracle de Producción.
* **Comando de Arranque**:
  ```bash
  docker compose -f docker-compose.yml --env-file .env.prod up -d --build
  ```
* **Puertos de Prod (Por defecto)**:
  - Backend: `5000`
  - PDA: `5173`
  - Frontend/Backoffice: `5175`
* **Nombre de Proyecto Compose**: `sga` (o el nombre de la carpeta base).

## 3. Resolución de Problemas (Troubleshooting)

Si ocurre un error como `port is already allocated` o `ORA-12543: TNS:destination host unreachable`:
1. Asegúrate de haber usado `--env-file .env.dev`. Si no lo hiciste, los contenedores de desarrollo se llamarán igual que los de producción o usarán sus puertos.
2. Limpia los contenedores huérfanos usando el mismo comando pero con `down`:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev down
   ```
3. Verifica qué proceso ocupa el puerto (`netstat -ano | findstr :5000` en Windows o `lsof -i :5000` en Linux) y evita matar procesos a ciegas, ya que podrías tumbar el entorno de Producción u otros servicios vitales (como el propio motor de Docker).
