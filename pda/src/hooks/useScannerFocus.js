import { useRef, useEffect } from 'react';

export function useScannerFocus() {
  const inputRef = useRef(null);

  useEffect(() => {
    // Función para forzar el foco siempre que se pierda,
    // a menos que el usuario esté tocando deliberadamente otro elemento interactivo.
    const enforceFocus = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        // Solo robar el foco si no estamos en otro input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'BUTTON') {
           inputRef.current.focus();
        }
      }
    };

    // Enfocar inicialmente
    enforceFocus();

    // Intentar mantener el foco al hacer click en cualquier parte de la pantalla
    document.addEventListener('click', enforceFocus);
    // Y cuando el foco se pierde de la ventana
    window.addEventListener('focus', enforceFocus);

    return () => {
      document.removeEventListener('click', enforceFocus);
      window.removeEventListener('focus', enforceFocus);
    };
  }, []);

  return inputRef;
}
