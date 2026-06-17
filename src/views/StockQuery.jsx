import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, ArrowLeft } from 'lucide-react';
import { useScannerFocus } from '../hooks/useScannerFocus';
import apiService from '../api/apiService';

export default function StockQuery() {
  const [ean, setEan] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Custom hook para forzar que el input reciba los datos del escáner
  const inputRef = useScannerFocus();

  const handleScan = async (e) => {
    e.preventDefault();
    if (!ean) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await apiService.get(`/stock/ean/${ean}`);
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
    <div className="flex flex-col flex-1 h-full p-4">
      <div className="flex items-center gap-2 mb-6">
         <button onClick={() => navigate('/utilidades')} className="p-2 bg-gray-200 rounded text-sga-dark">
           <ArrowLeft className="w-6 h-6" />
         </button>
         <h2 className="text-xl font-bold text-sga-dark">Consulta de Stock</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        
        <div className="bg-white p-6 rounded-full shadow-lg border-4 border-sga-secondary mb-6 animate-pulse">
          <ScanLine className="w-20 h-20 text-sga-secondary" />
        </div>
        
        <h3 className="text-2xl font-bold text-center text-sga-dark mb-4">
           {loading ? 'Consultando...' : 'Escanee o escriba el EAN'}
        </h3>

        <form onSubmit={handleScan} className="w-full flex flex-col gap-4 max-w-sm px-4">
           <input 
             ref={inputRef}
             type="text"
             value={ean}
             onChange={(e) => setEan(e.target.value)}
             className="w-full p-4 text-2xl font-mono text-center border-2 border-gray-400 rounded focus:border-sga-secondary focus:ring focus:ring-sga-secondary focus:ring-opacity-50 uppercase shadow-inner"
             placeholder="Ej. 12345"
             disabled={loading}
             autoFocus
           />
           <button 
             type="submit" 
             disabled={loading || !ean}
             className="w-full bg-sga-secondary hover:bg-yellow-600 text-white font-bold py-4 px-6 rounded text-xl shadow disabled:opacity-50 uppercase tracking-wider"
           >
             {loading ? 'Buscando...' : 'Consultar Manual'}
           </button>
        </form>

        {error && (
          <div className="mt-8 bg-sga-danger text-white w-full p-6 rounded-lg shadow-xl text-center">
            <span className="block text-2xl font-black">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
