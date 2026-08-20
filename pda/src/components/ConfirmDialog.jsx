import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

/**
 * Componente de diálogo de confirmación centralizado para la aplicación SGA PDA.
 * Útil para alertas de salida, confirmaciones de acciones críticas y advertencias.
 *
 * @param {boolean} isOpen - Controla la visibilidad del diálogo
 * @param {function} onCancel - Acción al cancelar o cerrar el diálogo
 * @param {function} onConfirm - Acción al pulsar el botón de confirmación
 * @param {React.ReactNode} [title='Atención'] - Título del diálogo
 * @param {React.ReactNode} [icon=<AlertTriangle />] - Icono en el encabezado
 * @param {string} [headerClassName='bg-brand-red text-white'] - Clases para el color del encabezado
 * @param {React.ReactNode} [message] - Texto principal de la pregunta o advertencia
 * @param {React.ReactNode} [children] - Contenido adicional o paneles explicativos
 * @param {string} [confirmText='CONFIRMAR'] - Texto del botón de confirmación
 * @param {string} [cancelText='CANCELAR'] - Texto del botón de cancelación
 * @param {string} [confirmButtonClassName='bg-brand-red text-white hover:bg-red-700'] - Clases para botón confirm
 * @param {string} [cancelButtonClassName='bg-gray-400 text-white hover:bg-gray-500'] - Clases para botón cancel
 */
const ConfirmDialog = ({
  isOpen,
  onCancel,
  onConfirm,
  title = 'Atención',
  icon = <AlertTriangle size={22} />,
  headerClassName = 'bg-brand-red text-white',
  message,
  children,
  confirmText = 'CONFIRMAR',
  cancelText = 'CANCELAR',
  confirmButtonClassName = 'bg-brand-red text-white hover:bg-red-700',
  cancelButtonClassName = 'bg-gray-400 text-white hover:bg-gray-500',
}) => {
  const footerButtons = (
    <div className="flex gap-2 w-full">
      <button
        type="button"
        onClick={onCancel}
        className={`flex-1 py-3 rounded font-bold shadow transition-colors ${cancelButtonClassName}`}
      >
        {cancelText}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className={`flex-1 py-3 rounded font-bold shadow transition-colors ${confirmButtonClassName}`}
      >
        {confirmText}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      icon={icon}
      headerClassName={headerClassName}
      showCloseButton={false}
      footer={footerButtons}
      contentClassName="p-5 flex flex-col gap-3 text-center"
    >
      {message && <p className="text-gray-800 text-lg font-bold">{message}</p>}
      {children}
    </Modal>
  );
};

export default ConfirmDialog;
