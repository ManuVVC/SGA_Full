# Guía de Testing para Agentes

Esta documentación detalla las convenciones y pasos necesarios para ejecutar y extender la suite de pruebas unitarias en el backend del SGA.

## Tecnologías Utilizadas
- **Pytest**: Como framework principal para la ejecución de tests.
- **unittest.mock (patch, MagicMock)**: Para simular la interacción con la base de datos (repositorios) y servicios externos.

## Estructura de Directorios
Las pruebas se ubican en el directorio `G:\Proyectos\SGA\backend\tests`.

## Cómo Ejecutar las Pruebas

Para ejecutar la suite completa de pruebas desde el entorno virtual del backend, utiliza el siguiente comando:

```bash
cd G:\Proyectos\SGA\backend
pytest tests/
```

Para ejecutar un archivo de pruebas específico (por ejemplo, el del servicio de autenticación):

```bash
pytest tests/test_auth_service.py
```

## Convenciones al Escribir Pruebas
1. **Nombres de archivos:** Deben comenzar con `test_` (ej. `test_auth_service.py`).
2. **Nombres de clases y métodos:** Las clases deben comenzar con `Test` y los métodos con `test_`.
3. **Mocking de dependencias:** Dado que la lógica interactúa intensamente con bases de datos Oracle, **siempre** simula (mock) las capas de repositorios (`AuthRepository`, `TerminalRepository`, etc.) para evitar dependencias de una base de datos real durante los tests.
4. **Prueba de excepciones:** Utiliza `pytest.raises` para verificar que se lancen los errores adecuados (ej. `UserNotFoundError`, `InvalidPasswordError`).

## Ejemplos Existentes
Puedes revisar `tests/test_auth_service.py` como referencia de cómo mockear múltiples dependencias usando el decorador `@patch` y configurar un entorno de prueba robusto con fixtures de `pytest`.
