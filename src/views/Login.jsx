import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import { LogIn, Monitor } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [terminal, setTerminal] = useState(null);
  const [terminalError, setTerminalError] = useState('');
  const navigate = useNavigate();
  
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    const fetchTerminal = async () => {
      try {
        const response = await apiService.get('/auth/terminal');
        if (response.status === 200 && response.data.terminal) {
          const termData = response.data.terminal;
          setTerminal(termData);
          
          if (termData.CODOPERADOR) {
            setUsername(termData.CODOPERADOR);
            // Autofocus password if operator is already set
            setTimeout(() => passwordRef.current?.focus(), 50);
          } else {
            // Autofocus username
            setTimeout(() => usernameRef.current?.focus(), 50);
          }
        }
      } catch (err) {
        setTerminalError(err.response?.data?.message || 'Terminal no autorizado o IP desconocida');
      }
    };
    fetchTerminal();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Introduce código y contraseña');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/auth/login', { username, password });
      
      if (response.status === 200) {
        localStorage.setItem('sga_token', response.data.token);
        localStorage.setItem('sga_permissions', JSON.stringify(response.data.permisos));
        localStorage.setItem('sga_operador', username);
        localStorage.setItem('sga_operador_nombre', response.data.operador_nombre);
        navigate('/menu');
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError('Contraseña Incorrecta');
        } else if (err.response.status === 404) {
          setError('Operador Inexistente');
        } else {
          setError(err.response.data?.message || 'Error en el servidor');
        }
      } else {
        setError('Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md border-t-4 border-sga-primary">
        <h2 className="text-2xl font-bold mb-4 text-center text-sga-dark flex items-center justify-center gap-2">
          <LogIn className="w-6 h-6 text-sga-primary" />
          Acceso Operador
        </h2>

        {/* Info del Terminal */}
        <div className="bg-gray-100 p-3 rounded mb-6 flex flex-col items-center border border-gray-300">
          <Monitor className="w-8 h-8 text-gray-500 mb-1" />
          {terminalError ? (
            <span className="text-red-600 font-bold text-center">{terminalError}</span>
          ) : terminal ? (
            <>
              <span className="font-bold text-sga-dark text-lg">{terminal.CODTERMINAL}</span>
              <span className="text-sm text-gray-600">{terminal.DESCRIPCION}</span>
            </>
          ) : (
            <span className="text-gray-500 text-sm">Verificando terminal...</span>
          )}
        </div>

        {error && (
          <div className="bg-sga-danger text-white p-3 rounded mb-4 text-center font-semibold text-lg">
            {error}
          </div>
        )}

        {/* Solo mostrar el formulario si el terminal es válido */}
        {!terminalError && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
               <label className="block text-lg font-semibold text-sga-dark mb-1">Código de Operador</label>
               <input 
                 ref={usernameRef}
                 type="text" 
                 className="w-full p-4 text-xl border-2 border-gray-300 rounded focus:border-sga-secondary focus:ring focus:ring-sga-secondary focus:ring-opacity-50 uppercase disabled:opacity-50"
                 value={username}
                 onChange={(e) => setUsername(e.target.value.toUpperCase())}
                 placeholder="EJ: 105"
                 disabled={!terminal}
               />
            </div>

            <div>
               <label className="block text-lg font-semibold text-sga-dark mb-1">Contraseña</label>
               <input 
                 ref={passwordRef}
                 type="password" 
                 className="w-full p-4 text-xl border-2 border-gray-300 rounded focus:border-sga-secondary focus:ring focus:ring-sga-secondary focus:ring-opacity-50 disabled:opacity-50"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 placeholder="***"
                 disabled={!terminal}
               />
            </div>

            <button 
              type="submit" 
              disabled={loading || !terminal}
              className="mt-4 w-full bg-sga-primary hover:bg-blue-900 text-white font-bold p-4 rounded text-xl shadow disabled:opacity-50"
            >
              {loading ? 'Validando...' : 'ENTRAR'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
