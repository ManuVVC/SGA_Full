# Refactorización de PreparaPedido.jsx

## Fecha: 2026-08-26

Se ha realizado una refactorización del componente `PreparaPedido.jsx` para mejorar su legibilidad y mantenibilidad, extrayendo la lógica de negocio y gestión de estado al nuevo hook `usePreparacionPedido.js`.

### Detalles de la refactorización:
- **Creación del hook `usePreparacionPedido`**: Este hook encapsula todos los estados (fase, cabecera, líneas pendientes, etc.), así como las funciones que interactúan con la API (como `comenzarPreparacion`, `ejecutarCarga`, etc.).
- **Limpieza en `PreparaPedido.jsx`**: El componente ahora importa y usa el hook de forma declarativa. Todas las funciones de negocio se delegaron al hook, dejando al componente enfocado exclusivamente en la renderización de la interfaz (JSX).
- **Archivos modificados/creados**:
  - `pda/src/views/PreparaPedido.jsx` (Modificado)
  - `pda/src/hooks/usePreparacionPedido.js` (Creado)
