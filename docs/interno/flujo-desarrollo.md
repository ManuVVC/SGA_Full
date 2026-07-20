# Flujo de Trabajo y Promoción a Producción

Este documento describe el flujo de desarrollo recomendado para realizar cambios en el sistema SGA, probando en desarrollo y promocionando los cambios a producción.

Al tener un único código base para ambos entornos, el flujo se basa en cómo cada entorno procesa el código:
*   **Desarrollo**: Monta el código directamente en el contenedor (`volumes: ./backend:/app`). Los cambios se reflejan inmediatamente gracias al *hot-reload*.
*   **Producción**: Copia el código dentro de la imagen al momento de compilar (`COPY . .` en el Dockerfile). Requiere **reconstruir** la imagen para aplicar cambios.

---

## 1. El Flujo de Trabajo Diario

El ciclo de desarrollo recomendado es el siguiente:

1.  **Edición de código**: Modificas los archivos `.py` (backend) o `.jsx/.js` (frontend) en tu editor local.
2.  **Pruebas en Desarrollo (Automático)**:
    *   No necesitas reiniciar nada. Flask (backend) y Vite (frontend) detectan los cambios y se recargan automáticamente.
    *   Verifica tus cambios accediendo a la URL de desarrollo: `http://localhost:5174` (o la IP correspondiente en el puerto 5174).
    *   Todas las operaciones afectarán a la Base de Datos de Desarrollo (`192.168.5.180`).
3.  **Aprobación**: Una vez validados los cambios en el entorno de desarrollo, están listos para pasar a producción.
4.  **Promoción a Producción (Rebuild manual)**:
    *   Se debe indicar a Docker que reconstruya las imágenes de producción para incluir el nuevo código y reiniciar los contenedores.
    *   Este proceso causa apenas unos segundos de *downtime* en producción.

---

## 2. Comandos para Promocionar a Producción

Dependiendo de qué parte del código hayas modificado, puedes reconstruir solo el componente afectado para minimizar el impacto. Ejecuta estos comandos desde la raíz del proyecto (`g:\Proyectos\SGA`).

### A. Si solo cambiaste Backend (Python)
```bash
docker compose -f docker-compose.yml --env-file .env.prod up -d --build --no-deps backend
```
*   Reconstruye la imagen `sga_prod-backend`.
*   Reinicia solo el contenedor del backend de producción.
*   El frontend de producción no se detiene.

### B. Si solo cambiaste Frontend (React / PDA)
```bash
docker compose -f docker-compose.yml --env-file .env.prod up -d --build --no-deps pda
```
*   Reconstruye la imagen `sga_prod-pda` (ejecuta el *build* de producción de React).
*   Reinicia solo el contenedor del frontend de producción.
*   El backend no se interrumpe.

### C. Si cambiaste ambos (Backend y Frontend)
```bash
docker compose -f docker-compose.yml --env-file .env.prod up -d --build
```
*   Reconstruye ambas imágenes y actualiza ambos contenedores.

---

## 3. Integración con Git (Control de Versiones)

Dado que se trata de un monorepo, se recomienda el siguiente modelo simplificado usando ramas:

1.  **Trabajar en una rama nueva**: 
    `git checkout -b feature/nueva-pantalla`
2.  **Desarrollar y probar en Dev**:
    Los cambios se prueban en vivo en el entorno de desarrollo (puertos 5174/5001).
3.  **Merge a la rama principal (main)**:
    Una vez validados los cambios, se fusionan en la rama principal.
    `git checkout main`
    `git merge feature/nueva-pantalla`
4.  **Desplegar**:
    Se ejecutan los comandos de rebuild de Producción (`up -d --build`) descritos en la sección 2.

*Nota: Si el equipo trabaja directamente sobre la rama `main` sin ramas adicionales, el flujo es el mismo: al guardar, pruebas en desarrollo y al terminar ejecutas el rebuild de producción.*

---
*Última actualización: 2026-07-20*
