import { useState, useEffect, useCallback } from 'react';
import apiService from '../api/apiService';

export function usePermissions() {
  const [terminalPerms, setTerminalPerms] = useState({});
  const [operadorPerms, setOperadorPerms] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Cargar permisos de operador desde localStorage
    try {
      const stored = localStorage.getItem('sga_permissions');
      if (stored) {
        setOperadorPerms(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error leyendo operadorPerms de localStorage", e);
    }

    // 2. Cargar permisos del terminal desde la API (o cache)
    const fetchTerminal = async () => {
      try {
        const response = await apiService.get('/auth/terminal');
        if (response.status === 200 && response.data.terminal && response.data.terminal.permisos) {
          setTerminalPerms(response.data.terminal.permisos);
        }
      } catch (err) {
        // Ignorar o loguear
      } finally {
        setLoading(false);
      }
    };
    fetchTerminal();
  }, []);

  const hasPermission = useCallback((permName) => {
    // Primero mira terminal, si es verdadero, lo permite.
    if (terminalPerms[permName] === true) return true;
    
    // Segundo mira operador
    if (operadorPerms[permName] === true) return true;
    
    return false;
  }, [terminalPerms, operadorPerms]);

  const hasOperatorPermission = useCallback((permName) => {
    return operadorPerms[permName] === true;
  }, [operadorPerms]);

  return { hasPermission, hasOperatorPermission, loading };
}
