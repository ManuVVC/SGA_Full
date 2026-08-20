import React, { useState, useEffect } from 'react';
import { Info, MapPin, Box, Search, ArrowLeft, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import Modal from './Modal';
import { getContenidoUbicacion, getUbicacionesArticulo } from '../api/preparacionService';
import { formatFechaES } from '../utils/dateUtils';

export default function LineaUtilidadesModal({ isOpen, onClose, linea }) {
  const [vista, setVista] = useState('MENU');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataUbicacion, setDataUbicacion] = useState(null);
  const [dataArticulo, setDataArticulo] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setVista('MENU');
      setError(null);
      setDataUbicacion(null);
      setDataArticulo(null);
    }
  }, [isOpen]);

  if (!isOpen || !linea) return null;

  const hasUbicacion = Boolean(linea.codubicacion || linea.codhueco || linea.nombreubicacion);
  const ubiLabel = linea.nombreubicacion || linea.codhueco || linea.descripcion || linea.codubicacion;
  const artLabel = linea.nombrearticulo;
  const refArt = linea.codarticuloaplicacion || linea.codarticulo;

  const handleVerContenidoUbicacion = async () => {
    if (!hasUbicacion) return;
    setLoading(true);
    setError(null);
    setVista('UBICACION');
    try {
      const targetUbi = linea.codubicacion || linea.codhueco || linea.nombreubicacion;
      const data = await getContenidoUbicacion(targetUbi);
      setDataUbicacion(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Error al obtener el contenido de la ubicación.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerUbicacionesArticulo = async () => {
    setLoading(true);
    setError(null);
    setVista('ARTICULO');
    try {
      const targetArt = linea.codarticulo || linea.codarticuloaplicacion;
      const data = await getUbicacionesArticulo(targetArt);
      setDataArticulo(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Error al obtener las ubicaciones del artículo.');
    } finally {
      setLoading(false);
    }
  };

  const renderTitle = () => {
    if (vista === 'UBICACION') return 'Contenido en Ubicación';
    if (vista === 'ARTICULO') return 'Ubicaciones de Artículo';
    return 'Utilidades de Línea';
  };

  const renderIcon = () => {
    if (vista === 'UBICACION') return <MapPin className="text-blue-200" />;
    if (vista === 'ARTICULO') return <Search className="text-blue-200" />;
    return <Info className="text-blue-200" />;
  };

  const renderFooter = () => {
    if (vista === 'MENU') {
      return (
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded shadow transition-colors"
        >
          CERRAR
        </button>
      );
    }
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setVista('MENU');
            setError(null);
          }}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft size={18} /> VOLVER
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded shadow transition-colors"
        >
          CERRAR
        </button>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={renderTitle()}
      icon={renderIcon()}
      footer={renderFooter()}
      maxWidth="max-w-md"
    >
      {/* Resumen siempre visible superior */}
      <div className="bg-blue-50/80 p-3 rounded-lg border border-blue-200 mb-4 flex flex-col gap-1.5 shadow-sm">
        <div className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
          <Box size={16} className="text-sga-primary shrink-0" />
          <span className="truncate">{artLabel}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600 font-mono">
          <span>Ref: {refArt}</span>
          {hasUbicacion ? (
            <span className="bg-white px-2 py-0.5 rounded border border-blue-200 font-bold text-sga-primary flex items-center gap-1">
              <MapPin size={12} /> {ubiLabel}
            </span>
          ) : (
            <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-[10px] font-bold">
              Sin ubicación asignada
            </span>
          )}
        </div>
      </div>

      {/* Contenido según vista */}
      {vista === 'MENU' && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={!hasUbicacion}
            onClick={handleVerContenidoUbicacion}
            className={`w-full p-3.5 rounded-lg border-2 text-left flex items-center gap-3 transition-all ${
              hasUbicacion
                ? 'border-blue-200 bg-white hover:border-sga-primary hover:bg-blue-50/50 shadow-sm active:scale-[0.99] cursor-pointer group'
                : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
            }`}
          >
            <div
              className={`p-3 rounded-lg shrink-0 ${
                hasUbicacion ? 'bg-blue-100 text-sga-primary group-hover:bg-sga-primary group-hover:text-white' : 'bg-gray-200 text-gray-400'
              } transition-colors`}
            >
              <MapPin size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800 text-base leading-tight">
                Contenido de la Ubicación
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">
                {hasUbicacion ? `Ver artículos en ${ubiLabel}` : 'No hay ubicación asignada en esta línea'}
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-sga-primary shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleVerUbicacionesArticulo}
            className="w-full p-3.5 rounded-lg border-2 border-blue-200 bg-white hover:border-sga-primary hover:bg-blue-50/50 shadow-sm active:scale-[0.99] cursor-pointer text-left flex items-center gap-3 transition-all group"
          >
            <div className="p-3 rounded-lg shrink-0 bg-blue-100 text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition-colors">
              <Box size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800 text-base leading-tight">
                Ubicaciones del Artículo
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">
                Ver dónde hay stock en el almacén
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-700 shrink-0" />
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500 gap-3">
          <RefreshCw size={36} className="animate-spin text-sga-primary" />
          <span className="text-sm font-medium">Consultando información en tiempo real...</span>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-lg flex items-center gap-2.5 text-sm">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && vista === 'UBICACION' && dataUbicacion && (
        <div className="flex flex-col gap-2">
          <div className="bg-gray-100 p-2 rounded-md flex justify-between items-center text-xs text-gray-700 border border-gray-200 font-medium">
            <span>Stock Total: <strong className="text-sga-primary text-sm">{dataUbicacion.stock_total || 0}</strong></span>
            <span>Artículos: <strong>{dataUbicacion.articulos?.length || 0}</strong></span>
          </div>

          {(!dataUbicacion.articulos || dataUbicacion.articulos.length === 0) ? (
            <div className="text-center p-6 bg-gray-50 rounded border text-gray-500 text-sm">
              Esta ubicación se encuentra actualmente vacía.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[42vh] overflow-y-auto pr-1">
              {dataUbicacion.articulos.map((art, idx) => {
                const isCurrentArt = String(art.cod_interno) === String(refArt);
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded border text-sm flex flex-col gap-1 transition-colors ${
                      isCurrentArt ? 'bg-blue-50/90 border-2 border-sga-primary shadow-sm' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-gray-800 leading-tight flex-1">{art.nombre}</span>
                      {isCurrentArt && (
                        <span className="bg-sga-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                          Línea actual
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-600 mt-0.5 font-mono">
                      <span>Ref: <strong>{art.cod_interno}</strong></span>
                      <span className="text-sga-success font-black text-sm">Stock: {art.stock}</span>
                    </div>
                    {(art.lote || art.fecha_caducidad) && (
                      <div className="flex gap-3 text-[11px] text-gray-500 border-t border-gray-100 pt-1 mt-0.5">
                        {art.lote && <span>Lote: <strong className="text-gray-700">{art.lote}</strong></span>}
                        {art.fecha_caducidad && <span>Cad: <strong className="text-gray-700">{formatFechaES(art.fecha_caducidad)}</strong></span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loading && !error && vista === 'ARTICULO' && dataArticulo && (
        <div className="flex flex-col gap-2">
          <div className="bg-gray-100 p-2 rounded-md flex justify-between items-center text-xs text-gray-700 border border-gray-200 font-medium">
            <span>Stock Total: <strong className="text-sga-success text-sm">{dataArticulo.stock_total || 0}</strong></span>
            <span>Ubicaciones: <strong>{dataArticulo.ubicaciones?.length || 0}</strong></span>
          </div>

          {(!dataArticulo.ubicaciones || dataArticulo.ubicaciones.length === 0) ? (
            <div className="text-center p-6 bg-gray-50 rounded border text-gray-500 text-sm">
              No hay stock disponible para este artículo en ninguna ubicación del almacén.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[42vh] overflow-y-auto pr-1">
              {dataArticulo.ubicaciones.map((ubi, idx) => {
                const ubiName = ubi.etiqueta || ubi.cod_ubicacion;
                const isCurrentUbi = String(ubi.cod_ubicacion) === String(linea.codubicacion) || (ubiLabel && String(ubiName).toLowerCase() === String(ubiLabel).toLowerCase());
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded border text-sm flex flex-col gap-1 transition-colors ${
                      isCurrentUbi ? 'bg-blue-50/90 border-2 border-sga-primary shadow-sm' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-sga-primary text-base">
                        <MapPin size={16} />
                        <span>{ubiName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrentUbi && (
                          <span className="bg-sga-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                            Ubicación actual
                          </span>
                        )}
                        <span className="text-sga-success font-black text-sm">Stock: {ubi.cantidad}</span>
                      </div>
                    </div>
                    {(ubi.lote || ubi.fecha_caducidad) && (
                      <div className="flex gap-3 text-[11px] text-gray-500 border-t border-gray-100 pt-1 mt-0.5">
                        {ubi.lote && <span>Lote: <strong className="text-gray-700">{ubi.lote}</strong></span>}
                        {ubi.fecha_caducidad && <span>Cad: <strong className="text-gray-700">{formatFechaES(ubi.fecha_caducidad)}</strong></span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
