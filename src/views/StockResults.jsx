import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Box, List, MapPin, Barcode } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';
import ActionMenu from '../components/ActionMenu';
import { useLongPress } from '../hooks/useLongPress';
import apiService from '../api/apiService';

export default function StockResults() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const rawData = location.state?.stockData;
  const articlesList = rawData?.data || [];

  // State
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [activeTab, setActiveTab] = useState(null); // 'eans' | 'ubicaciones'
  const [tabData, setTabData] = useState(null);
  const [loadingTab, setLoadingTab] = useState(false);
  const [tabError, setTabError] = useState('');

  // Long press y Menú de acciones
  const [selectedUbicacionForMenu, setSelectedUbicacionForMenu] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Si se accede a esta ruta sin datos, volver a la búsqueda
  useEffect(() => {
    if (!rawData) {
      navigate('/stock', { replace: true });
    } else if (articlesList.length === 1 && !selectedArticle) {
      // Auto select if only one match
      setSelectedArticle(articlesList[0]);
    }
  }, [rawData, navigate, articlesList, selectedArticle]);

  if (!rawData) return null;

  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    setActiveTab(null);
    setTabData(null);
    setTabError('');
  };

  const fetchTab = async (type) => {
    if (!selectedArticle) return;
    
    setLoadingTab(true);
    setTabError('');
    setActiveTab(type);
    setTabData(null);

    try {
      if (type === 'ubicaciones') {
        const res = await apiService.get(`/stock/${selectedArticle.cod_articulo}`);
        if (res.status === 200) {
          // El backend devuelve { status: "success", data: { articulo, tiene_stock, stock_total, ubicaciones: [] } }
          setTabData(res.data.data?.ubicaciones || []);
        }
      } else if (type === 'eans') {
        const res = await apiService.get(`/stock/article/${selectedArticle.cod_articulo}/eans`);
        if (res.status === 200) {
          // El backend devuelve { status: "success", data: [...] }
          setTabData(res.data.data || []);
        }
      }
    } catch (err) {
      setTabError(`Error al consultar ${type}`);
    } finally {
      setLoadingTab(false);
    }
  };

  const renderList = () => (
    <div className="flex flex-col gap-3">
      <h3 className="text-xl font-bold text-sga-dark mb-2 px-1">Artículos encontrados:</h3>
      {articlesList.length === 0 ? (
        <div className="bg-white p-6 rounded-lg text-center shadow">
           <span className="text-xl font-bold text-sga-danger">No se encontraron artículos</span>
        </div>
      ) : (
        articlesList.map((article, idx) => (
          <button 
            key={idx} 
            onClick={() => handleSelectArticle(article)}
            className="bg-white p-4 rounded-lg shadow text-left flex flex-col border-l-8 border-sga-primary active:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
              {article.cod_articulo_aplicacion || article.articulo_comercial}
            </span>
            <span className="text-xl font-black text-sga-dark mt-1">
              {article.nombre}
            </span>
          </button>
        ))
      )}
    </div>
  );

  const renderUbicaciones = () => {
    if (loadingTab) return <div className="text-center p-4 font-bold text-gray-500">Cargando ubicaciones...</div>;
    if (tabError) return <div className="bg-red-100 text-red-800 p-4 rounded font-bold text-center">{tabError}</div>;
    if (!tabData) return null;

    if (tabData.length === 0) {
      return (
        <div className="bg-gray-50 p-6 rounded-lg text-center shadow border-l-8 border-sga-danger">
          <span className="text-xl font-bold text-sga-danger">Sin stock en almacén</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 mt-4">
        {tabData.map((ubi, idx) => (
          <UbicacionRow 
            key={idx} 
            ubi={ubi} 
            onLongPress={(ubi) => {
              setSelectedUbicacionForMenu(ubi);
              setShowActionMenu(true);
            }} 
          />
        ))}

        {/* Action Menu */}
        <ActionMenu 
          title={selectedUbicacionForMenu?.etiqueta || selectedUbicacionForMenu?.cod_ubicacion}
          subtitle={selectedUbicacionForMenu?.etiqueta ? `Cod: ${selectedUbicacionForMenu?.cod_ubicacion}` : ''}
          isOpen={showActionMenu}
          onClose={() => setShowActionMenu(false)}
          onInfo={() => navigate('/utilidades/info-ubicacion', { state: { codUbicacion: selectedUbicacionForMenu?.cod_ubicacion }})}
          onAjustes={() => navigate('/stock/ajustes', { state: { codUbicacion: selectedUbicacionForMenu?.cod_ubicacion, codArticulo: tabData.articulo?.CODARTICULOAPLICACION || tabData.articulo?.CODARTICULO, articleData: tabData.articulo }})}
          infoLabel="Info Ubicación"
        />
      </div>
    );
  };

  const renderEans = () => {
    if (loadingTab) return <div className="text-center p-4 font-bold text-gray-500">Cargando EANs...</div>;
    if (tabError) return <div className="bg-red-100 text-red-800 p-4 rounded font-bold text-center">{tabError}</div>;
    if (!tabData) return null;

    if (tabData.length === 0) {
      return (
        <div className="bg-gray-50 p-6 rounded-lg text-center shadow border-l-8 border-gray-400">
          <span className="text-xl font-bold text-gray-600">No hay EANs registrados</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 mt-4">
        {tabData.map((eanItem, idx) => {
          const eanCode = eanItem.ean || eanItem.CODFACTURACION || eanItem.codfacturacion || String(eanItem);
          const factor = eanItem.factor;
          return (
            <div key={idx} className="bg-white p-4 rounded-lg shadow flex items-center justify-between border-l-8 border-sga-secondary">
              <div className="flex items-center gap-4">
                <Barcode className="text-gray-400 w-8 h-8 shrink-0" />
                <span className="block text-2xl font-black text-sga-dark tracking-widest">{eanCode}</span>
              </div>
              {factor && (
                <div className="text-right flex flex-col items-end">
                  <span className="text-xl font-bold text-sga-secondary">x{factor}</span>
                  <span className="text-xs uppercase font-bold text-gray-400">Factor</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-brand-light">
      <TerminalHeader title="INFO ARTÍCULO" />
      <div className="flex flex-col flex-1 relative p-4 pb-20 overflow-y-auto">
        
        {/* Navigation / Back Button */}
        {selectedArticle && articlesList.length > 1 && (
          <button 
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-2 mb-4 p-2 w-fit bg-white border border-gray-300 shadow rounded text-sga-dark font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a la lista
          </button>
        )}

        {/* Content */}
        {!selectedArticle ? (
          renderList()
        ) : (
          <div className="flex flex-col gap-4">
            {/* Cabecera del Artículo */}
            <div className="bg-white p-4 rounded-lg shadow border-b-4 border-sga-primary shrink-0">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                {selectedArticle.cod_articulo_aplicacion || selectedArticle.articulo_comercial}
              </h2>
              <h3 className="text-xl font-black text-sga-dark leading-tight mt-1">
                {selectedArticle.nombre}
              </h3>
            </div>

            {/* Dos opciones de consulta */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button 
                onClick={() => fetchTab('eans')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg shadow-md font-bold transition-colors ${
                  activeTab === 'eans' 
                    ? 'bg-sga-secondary text-white' 
                    : 'bg-white text-sga-dark hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <List className="w-8 h-8 mb-2" />
                <span>Mostrar EANs</span>
              </button>
              
              <button 
                onClick={() => fetchTab('ubicaciones')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg shadow-md font-bold transition-colors ${
                  activeTab === 'ubicaciones' 
                    ? 'bg-sga-primary text-white' 
                    : 'bg-white text-sga-dark hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <MapPin className="w-8 h-8 mb-2" />
                <span>Mostrar Stock</span>
              </button>
            </div>

            {/* Renderizar contenido de la pestaña */}
            {activeTab === 'eans' && renderEans()}
            {activeTab === 'ubicaciones' && renderUbicaciones()}
          </div>
        )}

      </div>

      {/* Botón flotante grande para regresar rápidamente al escáner */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-sga-light shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]">
        <button 
          onClick={() => navigate('/stock')}
          className="w-full bg-sga-primary hover:bg-blue-800 text-white font-bold p-5 rounded-lg text-2xl shadow flex items-center justify-center gap-3 active:bg-blue-900 transition-colors"
        >
          <Box className="w-8 h-8" />
          Nueva Búsqueda
        </button>
      </div>
    </div>
  );
}

function UbicacionRow({ ubi, onLongPress }) {
  const longPressProps = useLongPress(() => onLongPress(ubi), null, { delay: 600 });
  
  return (
    <div 
      className="bg-white p-4 rounded-lg shadow flex items-center justify-between border-l-8 border-sga-success select-none active:bg-blue-50 transition-colors"
      {...longPressProps}
    >
      <div>
        <span className="block text-3xl font-black text-sga-dark">{ubi.etiqueta}</span>
        <span className="block text-sm text-gray-500 font-semibold mt-1">
          Lote: {ubi.lote || '-'} | {ubi.cod_ubicacion}
          {ubi.fecha_caducidad && <span> | Cad: {ubi.fecha_caducidad}</span>}
        </span>
      </div>
      <div className="text-right flex flex-col items-end">
        <span className="text-4xl font-black text-sga-success">{ubi.cantidad}</span>
        <span className="text-xs uppercase font-bold text-gray-400">UDS</span>
      </div>
    </div>
  );
}
