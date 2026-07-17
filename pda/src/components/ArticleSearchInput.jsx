import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import apiService from '../api/apiService';
import SearchTypeToggle from './SearchTypeToggle';
import { useKeyboard } from '../contexts/KeyboardContext';

export default function ArticleSearchInput({ onArticleSelected, disabled, autoFocus }) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('codfacturacion');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [results, setResults] = useState([]);
  
  const { isKeyboardOpen } = useKeyboard();
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  // Forzar el foco en el input cuando el operario cambie el tipo de búsqueda o el teclado virtual
  useEffect(() => {
    if (inputRef.current && !disabled) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchType, isKeyboardOpen, disabled]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get('/stock/search', {
        params: { type: searchType, q: query.trim() }
      });

      if (response.status === 200 && response.data.data) {
        const data = response.data.data;
        if (data.length === 0) {
          setError('Artículo no encontrado');
          setQuery('');
          setTimeout(() => inputRef.current?.focus(), 100);
        } else if (data.length === 1) {
          selectArticle(data[0]);
        } else {
          setResults(data);
          setShowModal(true);
        }
      }
    } catch (err) {
      setError('Error en la búsqueda');
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const selectArticle = (item) => {
    setShowModal(false);
    setQuery('');
    // Normalizamos el objeto para que cualquier pantalla pueda consumirlo igual
    const normalizedArticle = {
      CODARTICULO: item.cod_articulo,
      CODARTICULOAPLICACION: item.cod_articulo_aplicacion,
      NOMBREARTICULO: item.nombre,
      UNIDADES: item.factor_conversion || 1,
      PRM_TRAZABILIDAD: item.PRM_TRAZABILIDAD,
      GESTIONARCADUCIDAD: item.GESTIONARCADUCIDAD,
      MARGENCADUCIDAD: item.MARGENCADUCIDAD,
      FECHADESCATALOGACION: item.FECHADESCATALOGACION,
      searchType,
      searchQuery: query
    };
    onArticleSelected(normalizedArticle);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex flex-col gap-3">
        <SearchTypeToggle value={searchType} onChange={setSearchType} inputRef={inputRef} />
        <input
          ref={inputRef}
          type="text"
          inputMode={isKeyboardOpen ? (searchType === 'nombrearticulo' ? 'text' : 'numeric') : 'none'}
          className="w-full p-4 border-2 border-sga-primary rounded text-center text-xl font-bold shadow-inner bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all uppercase"
          placeholder="Escanear artículo..."
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          disabled={disabled || loading}
        />
        <button 
          type="submit"
          disabled={disabled || loading || !query.trim()}
          className="w-full bg-sga-primary text-white py-3 rounded font-bold shadow disabled:opacity-50"
        >
          {loading ? 'BUSCANDO...' : 'BUSCAR'}
        </button>
        {error && <span className="text-red-600 font-bold text-sm px-1 animate-pulse">{error}</span>}
      </form>

      {/* MODAL MULTIPLES RESULTADOS */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-sga-secondary text-white p-3 font-bold text-center">
              Múltiples artículos encontrados
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="mb-3 text-sm text-gray-600 font-semibold text-center">
                Seleccione el artículo correcto:
              </p>
              <div className="flex flex-col gap-2">
                {results.map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => selectArticle(item)}
                    className="p-3 bg-gray-50 hover:bg-sga-blue hover:text-white border border-gray-200 rounded text-left transition-colors flex flex-col"
                  >
                    <span className="font-bold text-lg">{item.cod_articulo_aplicacion}</span>
                    <span className="text-sm truncate">{item.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
