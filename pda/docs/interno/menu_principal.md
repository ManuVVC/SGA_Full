# Diseño del Menú Principal

El Menú Principal ha sido diseñado para replicar la interfaz de usuario de las PDAs basadas en el diseño provisto por el cliente, ofreciendo un menú de acceso rápido a las distintas funcionalidades del SGA (Sistema de Gestión de Almacenes).

## Estructura Visual

El diseño se compone de tres secciones principales:

1.  **Cabecera (Header):**
    *   Fondo color verde oliva (`brand-olive`).
    *   Logo de "Alifoods" (actualmente usando texto estilizado como *placeholder*).
    *   Título "MENÚ PRINCIPAL" junto con el nombre del usuario activo (ej. Jose Perez).
    *   Indicadores en la esquina superior derecha que muestran el Terminal (TERM) y el Operador (Oper).

2.  **Cuerpo Principal:**
    *   Fondo gris claro (`brand-light`).
    *   Lista de 6 botones distribuidos en una sola columna ocupando todo el ancho disponible, con espaciado vertical.
    *   Cada botón incluye un icono representativo de gran tamaño (en color marrón oscuro) centrado por encima de su etiqueta de texto.
    *   Los botones definidos actualmente son:
        *   **PREPARA PEDIDO** (icono: ShoppingCart)
        *   **REUBICAR** (icono: ArrowLeftRight)
        *   **ENTRADA MERC.** (icono: Download)
        *   **INVENTARIO** (icono: Package) -> Redirige a la actual "Consulta Stock" (`/stock`).
        *   **DEVOLUCIONES** (icono: ClipboardList)
        *   **UTILIDADES** (icono: Wrench)
    *   Por petición inicial, **se muestran todos los botones siempre**, hasta que el sistema de backend de permisos requiera ocultar o deshabilitar opciones concretas.

3.  **Pie de Página (Footer):**
    *   Fondo color verde oliva continuo con la cabecera.
    *   Contiene el botón de **CERRAR SESIÓN** en un rojo corporativo (`brand-red`) ancho y centrado.

## Consideraciones Técnicas

*   Se han añadido nuevos colores corporativos (`brand-olive`, `brand-red`, `brand-light`) a la configuración global de Tailwind (`tailwind.config.js`).
*   Se ha eliminado la cabecera global (`SGA Cliente - Seypos PDA`) definida en `App.jsx` y los márgenes globales, permitiendo a cada vista (como este Menú Principal) gestionar su propio diseño de ancho completo a pantalla completa. Las demás vistas (`Login`, `StockQuery`, `StockResults`) se han modificado para incluir su propio `padding` (`p-4`) compensando la eliminación de los márgenes en `App.jsx`.
*   Se recuperan de forma reactiva el código del Terminal utilizando una llamada al endpoint `/auth/terminal` tras cargar el componente, proporcionando un valor predeterminado si este falla.
