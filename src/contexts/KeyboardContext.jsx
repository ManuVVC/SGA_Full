import React, { createContext, useContext, useState } from 'react';

const KeyboardContext = createContext();

export function KeyboardProvider({ children }) {
  // Por defecto el teclado virtual estará oculto (false) en las PDAs
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const toggleKeyboard = () => {
    setIsKeyboardOpen((prev) => !prev);
  };

  return (
    <KeyboardContext.Provider value={{ isKeyboardOpen, toggleKeyboard }}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard debe usarse dentro de un KeyboardProvider');
  }
  return context;
}
