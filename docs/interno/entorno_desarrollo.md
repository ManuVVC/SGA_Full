# Recomendación del Entorno de Desarrollo (SGA)

Dado que el proyecto es un "Monorepo" (contiene el Backend en Python y dos Frontends - Web y PDA - en JavaScript/Node), y considerando la futura migración a PostgreSQL, el entorno de desarrollo local ideal debe ser unificado, ágil y contenerizado.

## 1. Editor de Código (IDE)
**Recomendación principal: Visual Studio Code (VS Code)**
*   **¿Por qué?** Es el entorno perfecto para un proyecto *Full-Stack* como este. Evita tener que abrir PyCharm para el backend y WebStorm para el frontend. Todo se gestiona en la misma ventana.
*   **Extensiones recomendadas:**
    *   `Python` y `Pylance` (para autocompletado y tipado estricto en el backend).
    *   `Docker` (para levantar y bajar servicios sin tocar la terminal).
    *   `ESLint` / `Prettier` (para mantener el código del frontend y PDA limpio).
    *   `Thunder Client` o `REST Client` (para probar los endpoints de la API directamente desde el código sin abrir programas externos).

## 2. Infraestructura Local (Contenedores)
**Recomendación: Docker y Docker Compose**
*   **Estado actual:** El proyecto ya cuenta con un archivo `docker-compose.dev.yml`, lo cual es una práctica excelente.
*   **Adaptación para el nuevo ecosistema:**
    *   En lugar de instalar PostgreSQL nativamente en el ordenador de cada desarrollador, se debe añadir un servicio `postgres:15-alpine` en el `docker-compose.dev.yml`.
    *   De esta forma, cuando un nuevo desarrollador entre al proyecto, solo tendrá que ejecutar `docker-compose -f docker-compose.dev.yml up` y tendrá la base de datos de pruebas, el backend y los frontends levantados en segundos.

## 3. Cliente de Base de Datos (Gestor SQL)
**Recomendación principal: DBeaver (Community Edition)**
*   **¿Por qué?** DBeaver es universal y gratuito. Permite conectarse **tanto a Oracle como a PostgreSQL al mismo tiempo**. 
*   **Ventaja estratégica:** Durante la migración, los desarrolladores podrán tener una pestaña con la base de datos Oracle antigua y otra con la base de datos PostgreSQL nueva, permitiendo comparar datos, esquemas y resultados de consultas SQL en la misma pantalla.
*   *Alternativa:* `pgAdmin` (es la herramienta oficial de Postgres, muy buena para ver procesos internos, pero no permite conectar a Oracle).

## 4. Pruebas de API y Testing
**Recomendación: Postman o Bruno**
*   Como el Frontend y la PDA se comunican con el Backend mediante una API REST (Flask), es crucial tener un catálogo de los *endpoints*.
*   **Bruno** es una alternativa de código abierto muy ligera a Postman que guarda las colecciones directamente en carpetas del repositorio, permitiendo el control de versiones en Git de manera muy sencilla.

## 5. Control de Versiones
*   Continuar utilizando **Git**. Se recomienda la metodología *Feature Branch* (crear una rama nueva por cada funcionalidad: ej. `feature/modulo-entradas`, `fix/error-calculo-volumen`) para no interrumpir la rama principal (`main` o `develop`) mientras se programa.
