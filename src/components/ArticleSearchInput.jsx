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
      DESCRIPCION: item.nombre,
      UNIDADES: item.factor_conversion || 1,
    };
    onArticleSelected(normalizedArticle);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex flex-col gap-2">
        <SearchTypeToggle value={searchType} onChange={setSearchType} />
        
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode={isKeyboardOpen ? (searchType === 'nombrearticulo' ? 'text' : 'numeric') : 'none'}
            className="w-full border-2 border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none uppercase"
            placeholder="Escanee artículo"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            disabled={disabled || loading}
          />
          <button 
            type="submit"
            disabled={disabled || loading || !query.trim()}
            className="bg-sga-blue text-white p-3 rounded shadow hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <Search className="w-6 h-6" />
            )}
          </button>
        </div>
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
