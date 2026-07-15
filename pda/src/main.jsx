import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { KeyboardProvider } from './contexts/KeyboardContext'

// Importar el mock de la API. En producción esto se puede deshabilitar con una variable de entorno.
// import './api/mockAdapter'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </React.StrictMode>,
)
