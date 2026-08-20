import React from 'react';
import { XCircle } from 'lucide-react';

/**
 * Componente Modal centralizado para toda la aplicación SGA PDA.
 * Soporta tanto diálogos de confirmación centrados como modales de listado a pantalla completa.
 *
 * @param {boolean} isOpen - Controla la visibilidad del modal
 * @param {function} onClose - Función que se ejecuta al cerrar (botón X o fondo)
 * @param {React.ReactNode} title - Título del encabezado
 * @param {React.ReactNode} [icon] - Icono opcional junto al título
 * @param {string} [headerClassName='bg-sga-primary text-white'] - Clases para personalizar el color del encabezado
 * @param {boolean} [showCloseButton=true] - Muestra u oculta el botón X en la esquina superior derecha
 * @param {React.ReactNode} [footer] - Elementos o botones para el pie del modal
 * @param {React.ReactNode} children - Contenido principal
 * @param {string} [maxWidth='max-w-sm'] - Clases de ancho máximo (ej. max-w-sm, max-w-md, max-w-lg)
 * @param {boolean} [fullHeight=false] - Si es true, el contenedor expande su altura para listas largas
 * @param {string} [contentClassName='p-4 overflow-y-auto'] - Clases para el contenedor del contenido
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  icon = null,
  headerClassName = 'bg-sga-primary text-white',
  showCloseButton = true,
  footer = null,
  children,
  maxWidth = 'max-w-sm',
  fullHeight = false,
  contentClassName = 'p-4 overflow-y-auto',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center p-4">
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} overflow-hidden flex flex-col ${
          fullHeight ? 'flex-1' : 'max-h-[85vh]'
        }`}
      >
        {/* Encabezado */}
        <div className={`p-4 font-bold text-lg flex justify-between items-center ${headerClassName}`}>
          <div className="flex items-center gap-2">
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <span>{title}</span>
          </div>
          {showCloseButton && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-black/10 rounded transition-colors focus:outline-none"
              aria-label="Cerrar modal"
            >
              <XCircle size={24} />
            </button>
          )}
        </div>

        {/* Contenido principal */}
        <div className={`flex-1 ${contentClassName}`}>
          {children}
        </div>

        {/* Pie de modal opcional */}
        {footer && (
          <div className="p-4 border-t bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
