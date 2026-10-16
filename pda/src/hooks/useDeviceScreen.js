import { useState, useEffect } from 'react';

/**
 * Hook reactivo para consultar en tiempo real las dimensiones del dispositivo y viewport.
 * 
 * Soporta visualViewport para detectar cambios de altura cuando se abre el teclado en Android/Chrome.
 * 
 * @param {number} thresholdShort - Umbral en píxeles para considerar pantalla reducida (por defecto 550px).
 * @param {number} thresholdVeryShort - Umbral en píxeles para considerar pantalla muy reducida (por defecto 450px).
 * 
 * @returns {Object} Objeto con dimensiones y flags booleanos:
 *  - width: Ancho visible en px
 *  - height: Alto visible en px
 *  - screenWidth: Ancho total de la pantalla en px
 *  - screenHeight: Alto total de la pantalla en px
 *  - pixelRatio: Densidad de píxeles del panel
 *  - isShortScreen: true si height < thresholdShort
 *  - isVeryShortScreen: true si height < thresholdVeryShort
 *  - isNarrowScreen: true si width < 380px
 *  - isLandscape: true si width > height
 */
export function useDeviceScreen(thresholdShort = 550, thresholdVeryShort = 450) {
  const getScreenData = () => {
    // Si el navegador soporta visualViewport, refleja el espacio libre exacto incluso con teclado abierto
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;

    return {
      width: Math.round(viewportWidth),
      height: Math.round(viewportHeight),
      screenWidth: window.screen ? window.screen.width : viewportWidth,
      screenHeight: window.screen ? window.screen.height : viewportHeight,
      pixelRatio: window.devicePixelRatio || 1,
      isShortScreen: viewportHeight < thresholdShort,
      isVeryShortScreen: viewportHeight < thresholdVeryShort,
      isNarrowScreen: viewportWidth < 380,
      isLandscape: viewportWidth > viewportHeight,
    };
  };

  const [screen, setScreen] = useState(getScreenData);

  useEffect(() => {
    const handleResize = () => {
      setScreen(getScreenData());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [thresholdShort, thresholdVeryShort]);

  return screen;
}

export default useDeviceScreen;
