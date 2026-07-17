import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, AlertTriangle } from 'lucide-react';
import apiService from '../api/apiService';
import TerminalHeader from '../components/TerminalHeader';
import { useScannerFocus } from '../hooks/useScannerFocus';
import { useKeyboard } from '../contexts/KeyboardContext';
import SearchTypeToggle from '../components/SearchTypeToggle';

export default function StockQuery() {
  const [ean, setEan] = useState('');
  const [searchType, setSearchType] = useState('codfacturacion');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isKeyboardOpen } = useKeyboard();

  // Custom hook para forzar que el input reciba los datos del escáner
  const inputRef = useScannerFocus();

  // Forzar el foco en el input al cambiar el método de entrada o alternar teclado
  useEffect(() => {
    if (inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchType, isKeyboardOpen]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!ean) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiService.get('/stock/search', {
        params: { type: searchType, q: ean }
      });
      if (response.status === 200) {
        // Pasamos los datos al estado de la ruta para la siguiente pantalla
        navigate('/stock/results', { state: { stockData: response.data } });
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('EAN NO ENCONTRADO O SIN STOCK');
      } else {
        setError('Error al consultar stock');
      }
      setEan(''); // Limpiar para el siguiente intento rápido
    } finally {
      setLoading(false);
      // Tras la operación, aseguramos el foco para escanear de nuevo si hubo error
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-gray-100">
      <TerminalHeader title="INFO ARTICULO" />
      <div className="flex-1 p-4 overflow-y-auto pb-32">

        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate('/utilidades')} className="p-2 bg-white border border-gray-300 shadow rounded text-sga-dark">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-bold text-sga-dark">Volver</span>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-sm font-bold flex items-center gap-2">
            <AlertTriangle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2 flex items-center gap-2">
            <Search className="text-sga-primary" />
            {loading ? 'Consultando...' : 'Escanear Artículo'}
          </h2>

          <form onSubmit={handleScan} className="flex flex-col gap-3">
            <SearchTypeToggle value={searchType} onChange={setSearchType} inputRef={inputRef} />
            <input
              ref={inputRef}
              type="text"
              inputMode={isKeyboardOpen ? (searchType === 'nombrearticulo' ? 'text' : 'numeric') : 'none'}
              value={ean}
              onChange={(e) => setEan(e.target.value)}
              className="w-full p-4 border-2 border-sga-primary rounded text-center text-xl font-bold shadow-inner bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all uppercase"
              placeholder="Ej. 12345"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !ean}
              className="w-full bg-sga-primary text-white py-3 rounded font-bold shadow disabled:opacity-50"
            >
              {loading ? 'BUSCANDO...' : 'BUSCAR'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
