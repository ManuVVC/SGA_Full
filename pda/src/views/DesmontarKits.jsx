import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, Scissors, MapPin, Box, Layers, RefreshCw, AlertCircle } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';
import ArticleSearchInput from '../components/ArticleSearchInput';
import { validarUbicacion } from '../api/reubicacionesService';
import { obtenerKitsEnUbicacion, obtenerComposicionKit, validarDesmontajeKit, desmontarKit } from '../api/kitsService';
import { useKeyboard } from '../contexts/KeyboardContext';
import { formatFechaES } from '../utils/dateUtils';

export default function DesmontarKits() {
  const navigate = useNavigate();
  const { isKeyboardOpen } = useKeyboard();

  // Estados: 1 = Ubicación, 2 = Selección Kit, 3 = Cantidad, 4 = Confirmación, 5 = Éxito
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Ubicación
  const [ubicacionInput, setUbicacionInput] = useState('');
  const [ubicacionData, setUbicacionData] = useState(null);
  const ubicacionRef = useRef(null);

  // Modal para múltiples posiciones en ubicación
  const [showPosicionModal, setShowPosicionModal] = useState(false);
  const [posicionesDisponibles, setPosicionesDisponibles] = useState([]);

  // Kits en la ubicación
  const [kitsEnUbicacion, setKitsEnUbicacion] = useState([]);
  const [selectedKit, setSelectedKit] = useState(null);
  const [componentesKit, setComponentesKit] = useState([]);

  // Cantidad a desmontar
  const [cantidadInput, setCantidadInput] = useState('1');
  const cantidadRef = useRef(null);

  useEffect(() => {
    if (step === 1 && ubicacionRef.current) ubicacionRef.current.focus();
    if (step === 3 && cantidadRef.current) cantidadRef.current.focus();
  }, [step]);

  const resetProceso = () => {
    setStep(1);
    setLoading(false);
    setError(null);
    setSuccess(null);
    setUbicacionInput('');
    setUbicacionData(null);
    setKitsEnUbicacion([]);
    setSelectedKit(null);
    setComponentesKit([]);
    setCantidadInput('1');
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 2) {
        setSelectedKit(null);
        setComponentesKit([]);
      }
      if (step === 3) {
        setCantidadInput('1');
      }
      setStep(step - 1);
      setError(null);
      setSuccess(null);
    } else {
      navigate('/utilidades');
    }
  };

  // ----- PASO 1: VALIDAR UBICACIÓN -----
  const handleUbicacionKeyDown = async (e) => {
    if (e.key === 'Enter' && ubicacionInput.trim() !== '') {
      setError(null);
      setLoading(true);
      try {
        const res = await validarUbicacion(ubicacionInput.trim());
        if (res.status === 'success') {
          await cargarKitsDeUbicacion(res.ubicacion);
        } else if (res.status === 'necesita_posicion') {
          setPosicionesDisponibles(res.opciones);
          setShowPosicionModal(true);
        } else {
          setError(res.message || 'Ubicación no encontrada.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al validar la ubicación.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectPosicion = async (posicion) => {
    setShowPosicionModal(false);
    const ubi = posicionesDisponibles.find(p => p.POSICION === posicion);
    if (ubi) {
      setLoading(true);
      try {
        await cargarKitsDeUbicacion(ubi);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar kits de la ubicación.');
      } finally {
        setLoading(false);
      }
    }
  };

  const cargarKitsDeUbicacion = async (ubi) => {
    setUbicacionData(ubi);
    const res = await obtenerKitsEnUbicacion(ubi.CODUBICACION);
    if (res.status === 'success') {
      setKitsEnUbicacion(res.kits || []);
      setStep(2);
    } else {
      setError(res.message || 'Error al consultar los kits de la ubicación.');
    }
  };

  // ----- PASO 2: SELECCIÓN DE KIT -----
  const handleSelectKitItem = async (kit) => {
    if (kit.PERMITIDO_DESMONTAR === false) {
      setError('No se permite desmontar este kit en esta ubicación: incompatibilidad de zona de almacén.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const compRes = await obtenerComposicionKit(kit.CODARTICULO);
      if (compRes.status === 'success') {
        setSelectedKit(kit);
        setComponentesKit(compRes.componentes || []);
        setCantidadInput('1');
        setStep(3);
      } else {
        setError(compRes.message || 'Error al obtener la composición del kit.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar componentes del kit.');
    } finally {
      setLoading(false);
    }
  };

  const handleArticleScanned = async (article) => {
    const matchingKit = kitsEnUbicacion.find(k => k.CODARTICULO === article.CODARTICULO);
    if (matchingKit) {
      handleSelectKitItem(matchingKit);
    } else {
      setError(`El artículo escaneado (${article.NOMBREARTICULO}) no tiene stock de kit en esta ubicación.`);
    }
  };

  // ----- PASO 3: VALIDAR CANTIDAD -----
  const handleValidarCantidad = async () => {
    const unidades = parseFloat(cantidadInput);
    if (isNaN(unidades) || unidades <= 0) {
      setError('Indique una cantidad válida superior a 0.');
      return;
    }

    if (unidades > selectedKit.STOCK) {
      setError(`La cantidad indicada (${unidades}) supera el stock disponible (${selectedKit.STOCK}) del lote.`);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await validarDesmontajeKit(
        ubicacionData.CODUBICACION,
        selectedKit.CODARTICULO,
        selectedKit.NUMEROORDEN,
        unidades
      );
      if (res.status === 'success') {
        setStep(4);
      } else {
        setError(res.message || 'Error de validación al desmontar.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al validar el desmontaje del kit.');
    } finally {
      setLoading(false);
    }
  };

  // ----- PASO 4: CONFIRMAR Y EJECUTAR DESMONTAJE -----
  const handleConfirmarDesmontaje = async () => {
    const unidades = parseFloat(cantidadInput);
    if (isNaN(unidades) || unidades <= 0) {
      setError('Cantidad no válida.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const payload = {
        cod_ubicacion: ubicacionData.CODUBICACION,
        cod_articulo: selectedKit.CODARTICULO,
        numero_orden: selectedKit.NUMEROORDEN,
        unidades: unidades,
        tipo_actualizacion: 0
      };

      const res = await desmontarKit(payload);
      if (res.status === 'success') {
        setSuccess(res.message || `Se han desmontado satisfactoriamente ${unidades} unidades.`);
        setStep(5);
      } else {
        setError(res.message || 'Error al ejecutar el desmontaje.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al procesar el desensamblado del kit.');
    } finally {
      setLoading(false);
    }
  };

  const unidadesNumericas = parseFloat(cantidadInput) || 0;

  return (
    <div className="flex flex-col flex-1 h-full bg-brand-light">
      <TerminalHeader title="DESMONTAJE KITS" />

      {/* BARRA DE NAVEGACIÓN Y PASO */}
      <div className="bg-gray-200 border-b border-gray-300 px-2.5 py-1.5 flex items-center justify-between">
        <button 
          onClick={handleBack} 
          disabled={loading}
          className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-white border border-gray-300 px-2.5 py-1 rounded active:bg-gray-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{step === 1 ? 'Menú' : 'Atrás'}</span>
        </button>
        <span className="text-[11px] font-black uppercase text-gray-600 tracking-wider">
          {step === 1 && 'Paso 1/3: Ubicación'}
          {step === 2 && 'Paso 2/3: Selección Kit'}
          {step === 3 && 'Paso 3/3: Cantidad'}
          {step === 4 && 'Confirmar Desmontaje'}
          {step === 5 && 'Desmontaje Completado'}
        </span>
      </div>

      {/* CONTENIDO PRINCIPAL SCROLLEABLE */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 flex flex-col gap-2 sm:gap-2.5">
        {/* BANNER DE ERROR */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-800 p-2 rounded-lg flex items-start gap-2 shadow-xs animate-shake">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="text-xs font-bold">{error}</span>
          </div>
        )}

        {/* BANNER DE ÉXITO (PASO 5) */}
        {step === 5 && success && (
          <div className="bg-green-100 border-2 border-green-500 rounded-lg p-3 sm:p-4 flex flex-col items-center text-center gap-2.5 shadow-md">
            <CheckCircle className="w-10 h-10 text-green-600" />
            <h2 className="text-base sm:text-lg font-black text-green-800">¡Kit Desmontado con Éxito!</h2>
            <p className="text-xs font-bold text-gray-700">{success}</p>

            <div className="w-full bg-white border border-gray-200 rounded p-2.5 text-left text-xs text-gray-700 space-y-1 mt-0.5">
              <div><span className="font-bold">Kit:</span> {selectedKit?.NOMBREARTICULO}</div>
              <div><span className="font-bold">Código:</span> {selectedKit?.CODARTICULOAPLICACION}</div>
              <div><span className="font-bold">Cantidad Desmontada:</span> {cantidadInput} unidades</div>
              <div><span className="font-bold">Ubicación:</span> {ubicacionData?.UBICACION}</div>
              {selectedKit?.NUMEROLOTE && <div><span className="font-bold">Lote Retirado:</span> {selectedKit.NUMEROLOTE}</div>}
            </div>

            <div className="w-full flex flex-col gap-2 mt-1">
              <button
                onClick={resetProceso}
                className="w-full bg-sga-blue hover:bg-blue-800 text-white font-black py-2.5 rounded-lg shadow flex items-center justify-center gap-1.5 active:bg-blue-900 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>DESMONTAR OTRO KIT</span>
              </button>
              <button
                onClick={() => navigate('/utilidades')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 rounded-lg shadow flex items-center justify-center gap-1.5 text-sm"
              >
                <span>VOLVER A UTILIDADES</span>
              </button>
            </div>
          </div>
        )}

        {/* RESUMEN DE UBICACIÓN COMPACTO */}
        {step > 1 && ubicacionData && (
          <div className="bg-white border border-gray-300 rounded px-2.5 py-1.5 flex items-center justify-between shadow-xs text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-4 h-4 text-sga-blue shrink-0" />
              <span className="text-gray-500 font-medium">Ubicación:</span>
              <span className="font-black text-sga-dark truncate">{ubicacionData.UBICACION}</span>
            </div>
            {step < 5 && (
              <button 
                onClick={() => setStep(1)} 
                className="text-xs text-sga-blue font-bold hover:underline shrink-0 ml-2"
                disabled={loading}
              >
                Cambiar
              </button>
            )}
          </div>
        )}

        {/* RESUMEN DE KIT SELECCIONADO COMPACTO */}
        {step > 2 && selectedKit && (
          <div className="bg-white border border-gray-300 rounded px-2.5 py-1.5 flex items-center justify-between shadow-xs text-xs">
            <div className="flex items-center gap-2 truncate">
              <Scissors className="w-4 h-4 text-sga-red shrink-0" />
              <div className="truncate">
                <span className="font-black text-sga-dark truncate block leading-tight">{selectedKit.NOMBREARTICULO}</span>
                <span className="text-[11px] font-mono text-gray-500">
                  Cód: {selectedKit.CODARTICULOAPLICACION} | Stock: {selectedKit.STOCK}
                  {selectedKit.NUMEROLOTE ? ` | Lote: ${selectedKit.NUMEROLOTE}` : ''}
                </span>
              </div>
            </div>
            {step < 5 && (
              <button 
                onClick={() => setStep(2)} 
                className="text-xs text-sga-blue font-bold hover:underline shrink-0 ml-2"
                disabled={loading}
              >
                Cambiar
              </button>
            )}
          </div>
        )}

        {/* ===== PASO 1: ENTRADA DE UBICACIÓN ===== */}
        {step === 1 && (
          <div className="bg-white border border-gray-300 rounded-lg p-2.5 sm:p-3 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-sga-dark border-b pb-1.5">
              <MapPin className="w-4 h-4 text-sga-blue" />
              <h3 className="font-black text-xs uppercase">Escanee la Ubicación</h3>
            </div>
            <p className="text-xs text-gray-600">
              Indique la ubicación donde se encuentra el kit que desea desmontar.
            </p>
            <input 
              ref={ubicacionRef}
              type="text"
              inputMode={isKeyboardOpen ? "text" : "none"}
              value={ubicacionInput}
              onChange={(e) => setUbicacionInput(e.target.value)}
              onKeyDown={handleUbicacionKeyDown}
              disabled={loading}
              placeholder="Escanee ubicación..."
              className="w-full border-2 border-gray-300 p-2.5 rounded-lg text-base font-bold focus:border-sga-blue focus:outline-none"
            />
            <button
              onClick={() => handleUbicacionKeyDown({ key: 'Enter' })}
              disabled={loading || !ubicacionInput.trim()}
              className="w-full bg-sga-blue hover:bg-blue-800 disabled:opacity-50 text-white font-black py-2.5 rounded-lg shadow text-sm"
            >
              {loading ? 'BUSCANDO KITS...' : 'CONFIRMAR UBICACIÓN'}
            </button>
          </div>
        )}

        {/* ===== PASO 2: SELECCIÓN DE KIT ===== */}
        {step === 2 && (
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            {/* ESCANEO RÁPIDO COMPACTO */}
            <div className="bg-white border border-gray-300 rounded-lg p-2 shadow-xs">
              <ArticleSearchInput 
                autoFocus 
                compact={true}
                onArticleSelected={handleArticleScanned}
                disabled={loading}
                placeholder="Escanear o buscar kit..."
              />
            </div>

            {/* LISTA DE KITS DISPONIBLES EN LA UBICACIÓN */}
            <div className="bg-white border border-gray-300 rounded-lg p-2 shadow-xs flex flex-col gap-1.5 flex-1 min-h-0">
              <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                <h3 className="font-black text-xs uppercase text-gray-700">Kits en esta Ubicación</h3>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {kitsEnUbicacion.length} disponibles
                </span>
              </div>

              {kitsEnUbicacion.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500 font-bold bg-gray-50 rounded">
                  No hay kits con stock disponibles para desmontar en esta ubicación.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[50vh]">
                  {kitsEnUbicacion.map((kit, idx) => {
                    const bloqueado = kit.PERMITIDO_DESMONTAR === false;
                    return (
                      <button
                        key={`${kit.CODARTICULO}-${kit.NUMEROORDEN}-${idx}`}
                        onClick={() => handleSelectKitItem(kit)}
                        disabled={loading || bloqueado}
                        className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                          bloqueado 
                            ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                            : 'bg-white border-gray-300 hover:border-sga-blue hover:bg-blue-50/40 shadow-xs active:scale-[0.99]'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-1">
                          <span className="font-bold text-xs text-sga-dark truncate flex-1">{kit.NOMBREARTICULO}</span>
                          <span className="font-black text-xs text-sga-blue bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                            {kit.STOCK} uds
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-gray-500">
                          <span>Cód: <b className="text-gray-700">{kit.CODARTICULOAPLICACION}</b></span>
                          {kit.NUMEROLOTE && <span>Lote: <b className="text-gray-700">{kit.NUMEROLOTE}</b></span>}
                          {kit.FECHACADUCIDAD && <span>Cad: <b className="text-gray-700">{formatFechaES(kit.FECHACADUCIDAD)}</b></span>}
                        </div>
                        {bloqueado && (
                          <div className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Incompatible con la zona del almacén</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== PASO 3: CANTIDAD Y DESGLOSE DE COMPONENTES ===== */}
        {step === 3 && selectedKit && (
          <div className="flex flex-col gap-2">
            {/* SELECTOR ERGONÓMICO DE CANTIDAD */}
            <div className="bg-white border border-gray-300 rounded-lg p-2.5 shadow-xs flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-black uppercase text-gray-700">Cantidad a Desmontar</label>
                <span className="font-bold text-gray-500">
                  Stock disponible: <b className="text-sga-blue font-black">{selectedKit.STOCK}</b>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCantidadInput(prev => Math.max(1, (parseFloat(prev) || 1) - 1).toString())}
                  className="w-11 h-11 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-black text-xl flex items-center justify-center text-gray-700 active:scale-95 shrink-0"
                >
                  -
                </button>
                <input 
                  ref={cantidadRef}
                  type="number"
                  min="1"
                  max={selectedKit.STOCK}
                  step="1"
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleValidarCantidad(); }}
                  disabled={loading}
                  className="flex-1 h-11 border-2 border-gray-300 rounded-lg text-xl font-black text-center focus:border-sga-blue focus:outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={() => setCantidadInput(prev => Math.min(selectedKit.STOCK, (parseFloat(prev) || 0) + 1).toString())}
                  className="w-11 h-11 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-black text-xl flex items-center justify-center text-gray-700 active:scale-95 shrink-0"
                >
                  +
                </button>
              </div>
            </div>

            {/* DESGLOSE DE PIEZAS QUE SE RECUPERARÁN */}
            <div className="bg-white border border-gray-300 rounded-lg p-2.5 shadow-xs flex flex-col gap-1.5">
              <h4 className="text-xs font-black uppercase text-gray-700 border-b pb-1">
                Componentes a Recuperar
              </h4>
              <div className="flex flex-col gap-1.5 max-h-48 sm:max-h-60 overflow-y-auto">
                {componentesKit.map((comp) => {
                  const piezasRecuperadas = unidadesNumericas * comp.UNIDADES;
                  return (
                    <div 
                      key={comp.CODARTICULOHIJO} 
                      className="p-1.5 rounded border border-gray-200 bg-gray-50 flex flex-col gap-0.5 text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold truncate max-w-[200px]">{comp.NOMBREARTICULO}</span>
                        <span className="font-mono text-gray-500 text-[11px]">{comp.CODARTICULOAPLICACION}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-gray-600">
                        <span>Ratio: {comp.UNIDADES} ud/kit</span>
                        <span className="font-bold text-green-700">
                          + {piezasRecuperadas} unidades
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleValidarCantidad}
              disabled={loading || unidadesNumericas <= 0 || unidadesNumericas > selectedKit.STOCK}
              className="w-full bg-sga-blue hover:bg-blue-800 disabled:opacity-50 text-white font-black py-3 rounded-lg shadow text-sm active:bg-blue-900"
            >
              {loading ? 'VALIDANDO...' : 'CONTINUAR'}
            </button>
          </div>
        )}

        {/* ===== PASO 4: CONFIRMAR DESMONTAJE ===== */}
        {step === 4 && selectedKit && (
          <div className="bg-white border border-gray-300 rounded-lg p-2.5 shadow-xs flex flex-col gap-2.5">
            <h3 className="font-black text-xs uppercase text-sga-dark border-b pb-1">
              Confirmar Desensamblado de Kit
            </h3>

            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded-lg text-xs flex flex-col gap-1">
              <div className="font-bold flex items-center gap-1 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Atención: Acción de inventario irreversible</span>
              </div>
              <p>
                Se darán de baja <b>{cantidadInput}</b> unidades del kit <b>{selectedKit.NOMBREARTICULO}</b> en la ubicación <b>{ubicacionData?.UBICACION}</b>.
              </p>
              <p>
                Sus componentes se reincorporarán automáticamente al stock de dicha ubicación.
              </p>
            </div>

            {/* BOTÓN CONFIRMAR DESMONTAJE */}
            <button
              onClick={handleConfirmarDesmontaje}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black py-3 rounded-lg shadow text-base flex items-center justify-center gap-2 active:bg-red-800 mt-1"
            >
              {loading ? 'DESMONTANDO...' : 'CONFIRMAR Y DESMONTAR KIT'}
            </button>
          </div>
        )}
      </div>

      {/* MODAL PARA SELECCIÓN DE POSICIÓN */}
      {showPosicionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="bg-sga-blue text-white p-3 font-bold text-center">
              Múltiples posiciones encontradas
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-80">
              <p className="mb-3 text-xs text-gray-600 font-semibold text-center">
                Seleccione la posición correcta para la etiqueta escaneada:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {posicionesDisponibles.map((op, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSelectPosicion(op.POSICION)}
                    className="p-3 bg-gray-100 hover:bg-sga-blue hover:text-white border border-gray-300 rounded font-bold text-base transition-colors"
                  >
                    Posición {op.POSICION}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 bg-gray-100 border-t flex justify-end">
              <button 
                onClick={() => setShowPosicionModal(false)}
                className="px-4 py-2 bg-gray-500 text-white font-bold rounded text-xs"
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
