import React from 'react';

const VARIANT_CLASSES = {
  default: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
  primary: 'bg-sga-primary/10 hover:bg-sga-primary/20 text-sga-primary',
  info: 'bg-blue-50 hover:bg-blue-100 text-blue-800',
  success: 'bg-green-50 hover:bg-green-100 text-green-800',
  danger: 'bg-red-50 hover:bg-red-100 text-red-800',
};

const ICON_COLOR_CLASSES = {
  default: 'text-sga-primary',
  primary: 'text-sga-primary',
  info: 'text-blue-600',
  success: 'text-green-600',
  danger: 'text-red-600',
};

/**
 * Componente centralizado para barra de navegación / acciones inferior en flujos PDA (wizard).
 *
 * @param {Array<{
 *   id?: string|number,
 *   label: string,
 *   icon?: React.ReactNode,
 *   onClick: function,
 *   disabled?: boolean,
 *   variant?: 'default'|'primary'|'info'|'success'|'danger',
 *   className?: string,
 *   iconClassName?: string
 * }>} items - Botones a renderizar en la barra
 * @param {string} [className] - Clases adicionales para el contenedor de la barra
 * @param {number} [columns] - Número de columnas (si no se especifica, usa items.length o 3 como máximo)
 */
const WizardBottomBar = ({ items = [], className = '', columns = null }) => {
  if (!items || items.length === 0) return null;

  const numCols = columns || Math.min(items.length, 4);
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[numCols] || 'grid-cols-3';

  return (
    <div
      className={`bg-white border-t p-2 grid ${gridColsClass} gap-2 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] ${className}`}
    >
      {items.map((item, index) => {
        const variant = item.variant || 'default';
        const buttonStyle = item.className || VARIANT_CLASSES[variant] || VARIANT_CLASSES.default;
        const iconStyle = item.iconClassName || ICON_COLOR_CLASSES[variant] || ICON_COLOR_CLASSES.default;

        return (
          <button
            key={item.id || index}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled || false}
            className={`font-bold py-3 rounded shadow-sm flex flex-col items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none ${buttonStyle}`}
          >
            {item.icon && (
              <span className={`mb-1 flex-shrink-0 ${iconStyle}`}>
                {item.icon}
              </span>
            )}
            <span className="text-xs uppercase tracking-wide">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default WizardBottomBar;
