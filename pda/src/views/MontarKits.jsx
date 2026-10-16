import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, Layers, MapPin, Box, Calendar, Tag, Check, RefreshCw } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';
import ArticleSearchInput from '../components/ArticleSearchInput';
import { validarUbicacion } from '../api/reubicacionesService';
import { obtenerComposicionKit, validarMontajeKit, montarKit } from '../api/kitsService';
import { useKeyboard } from '../contexts/KeyboardContext';
import { formatFechaES } from '../utils/dateUtils';

export default function MontarKits() {
  const navigate = useNavigate();
  const { isKeyboardOpen } = useKeyboard();

  // Estados: 1 = Ubicación Origen, 2 = Artículo Kit, 3 = Cantidad y Componentes, 4 = Datos Lote/Destino, 5 = Confirmación
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Ubicación Origen
  const [origenInput, setOrigenInput] = useState('');
  const [origenData, setOrigenData] = useState(null);
  const origenRef = useRef(null);

  // Modal para múltiples posiciones en ubicación
  const [showPosicionModal, setShowPosicionModal] = useState(false);
  const [posicionesDisponibles, setPosicionesDisponibles] = useState([]);
  const [targetPosicionType, setTargetPosicionType] = useState('origen'); // 'origen' | 'destino'

  // Artículo Kit y Componentes
  const [kitData, setKitData] = useState(null);
  const [componentes, setComponentes] = useState([]);
  const [maxKitsPosibles, setMaxKitsPosibles] = useState(0);

  // Cantidad a montar
  const [cantidadInput, setCantidadInput] = useState('1');
  const cantidadRef = useRef(null);

  // Trazabilidad y Destino
  const [fechaCaducidadInput, setFechaCaducidadInput] = useState('');
  const [numeroLoteInput, setNumeroLoteInput] = useState('');
  const [destinoDiferente, setDestinoDiferente] = useState(false);
  const [destinoInput, setDestinoInput] = useState('');
  const [destinoData, setDestinoData] = useState(null);
  const destinoRef = useRef(null);

  // Auto-focus según paso
  useEffect(() => {
    if (step === 1 && origenRef.current) origenRef.current.focus();
    if (step === 3 && cantidadRef.current) cantidadRef.current.focus();
    if (step === 4 && destinoDiferente && destinoRef.current) destinoRef.current.focus();
  }, [step, destinoDiferente]);

  const resetProceso = () => {
    setStep(1);
    setLoading(false);
    setError(null);
    setSuccess(null);
    setOrigenInput('');
    setOrigenData(null);
    setKitData(null);
    setComponentes([]);
    setMaxKitsPosibles(0);
    setCantidadInput('1');
    setFechaCaducidadInput('');
    setNumeroLoteInput('');
    setDestinoDiferente(false);
    setDestinoInput('');
    setDestinoData(null);
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 2) {
        setKitData(null);
        setComponentes([]);
      }
      if (step === 3) {
        setCantidadInput('1');
      }
      if (step === 4) {
        setFechaCaducidadInput('');
        setNumeroLoteInput('');
      }
      setStep(step - 1);
      setError(null);
      setSuccess(null);
    } else {
      navigate('/utilidades');
    }
  };

  // ----- PASO 1: VALIDAR UBICACIÓN ORIGEN -----
  const handleOrigenKeyDown = async (e) => {
    if (e.key === 'Enter' && origenInput.trim() !== '') {
      setError(null);
      setLoading(true);
      try {
        const res = await validarUbicacion(origenInput.trim());
        if (res.status === 'success') {
          setOrigenData(res.ubicacion);
          setStep(2);
        } else if (res.status === 'necesita_posicion') {
          setPosicionesDisponibles(res.opciones);
          setTargetPosicionType('origen');
          setShowPosicionModal(true);
        } else {
          setError(res.message || 'Ubicación no encontrada.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al validar la ubicación de origen.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectPosicion = (posicion) => {
    setShowPosicionModal(false);
    if (targetPosicionType === 'origen') {
      const ubi = posicionesDisponibles.find(p => p.POSICION === posicion);
      if (ubi) {
        setOrigenData(ubi);
        setStep(2);
      }
    } else if (targetPosicionType === 'destino') {
      const ubi = posicionesDisponibles.find(p => p.POSICION === posicion);
      if (ubi) {
        setDestinoData(ubi);
      }
    }
  };

  // ----- PASO 2: SELECCIÓN DE ARTÍCULO KIT -----
  const handleArticleSelected = async (article) => {
    setError(null);
    setLoading(true);
    try {
      const res = await obtenerComposicionKit(article.CODARTICULO, origenData.CODUBICACION);
      if (res.status === 'success') {
        setKitData({
          ...article,
          ...res.articulo
        });
        setComponentes(res.componentes || []);
        setMaxKitsPosibles(res.max_kits !== null ? res.max_kits : 0);
        setCantidadInput('1');
        setStep(3);
      } else {
        setError(res.message || 'El artículo seleccionado no es un kit válido o no tiene componentes.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al obtener la composición del kit.');
    } finally {
      setLoading(false);
    }
  };

  // ----- PASO 3: VALIDAR CANTIDAD -----
  const handleValidarCantidad = async () => {
    const cant = parseFloat(cantidadInput);
    if (isNaN(cant) || cant <= 0) {
      setError('Indique una cantidad válida superior a 0.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await validarMontajeKit(origenData.CODUBICACION, kitData.CODARTICULO, cant);
      if (res.status === 'success') {
        setStep(4);
      } else {
        setError(res.message || 'Stock insuficiente de componentes para montar esta cantidad.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al comprobar disponibilidad de componentes.');
    } finally {
      setLoading(false);
    }
  };

  // ----- PASO 4: DESTINO ADICIONAL -----
  const handleDestinoKeyDown = async (e) => {
    if (e.key === 'Enter' && destinoInput.trim() !== '') {
      setError(null);
      setLoading(true);
      try {
        const res = await validarUbicacion(destinoInput.trim());
        if (res.status === 'success') {
          setDestinoData(res.ubicacion);
        } else if (res.status === 'necesita_posicion') {
          setPosicionesDisponibles(res.opciones);
          setTargetPosicionType('destino');
          setShowPosicionModal(true);
        } else {
          setError(res.message || 'Ubicación de destino no encontrada.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error al validar la ubicación de destino.');
      } finally {
        setLoading(false);
      }
    }
  };

  // ----- PASO 5: EJECUTAR MONTAJE -----
  const handleConfirmarMontaje = async () => {
    const cant = parseFloat(cantidadInput);
    if (isNaN(cant) || cant <= 0) {
      setError('Cantidad no válida.');
      return;
    }

    // Validar trazabilidad si el kit lo requiere
    if (kitData.GESTIONARCADUCIDAD !== 0 && !fechaCaducidadInput.trim()) {
      setError('Este kit requiere indicar una fecha de caducidad.');
      return;
    }
    if (kitData.PRM_TRAZABILIDAD !== 0 && !numeroLoteInput.trim()) {
      setError('Este kit requiere indicar un número de lote.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const destUbiId = destinoDiferente && destinoData ? destinoData.CODUBICACION : origenData.CODUBICACION;
      const payload = {
        cod_ubicacion_origen: origenData.CODUBICACION,
        cod_articulo: kitData.CODARTICULO,
        cantidad: cant,
        fecha_caducidad: fechaCaducidadInput.trim() || null,
        numero_lote: numeroLoteInput.trim() || null,
        cod_ubicacion_destino: destUbiId,
        cod_facturacion: kitData.searchType === 'codfacturacion' ? kitData.searchQuery : null
      };

      const res = await montarKit(payload);
      if (res.status === 'success') {
        setSuccess(res.message || `Se han montado ${cant} unidades del kit.`);
        setStep(5);
      } else {
        setError(res.message || 'Error al ejecutar el montaje del kit.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al procesar el montaje del kit en almacén.');
    } finally {
      setLoading(false);
    }
  };

  const cantNumerica = parseFloat(cantidadInput) || 0;

  return (
    <div className="flex flex-col flex-1 h-full bg-brand-light">
      <TerminalHeader title="MONTAR KITS" />

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
          {step === 1 && 'Paso 1/4: Ubicación'}
          {step === 2 && 'Paso 2/4: Selección Kit'}
          {step === 3 && 'Paso 3/4: Cantidad'}
          {step === 4 && 'Paso 4/4: Trazabilidad/Destino'}
          {step === 5 && 'Montaje Completado'}
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
            <h2 className="text-base sm:text-lg font-black text-green-800">¡Montaje de Kit Realizado!</h2>
            <p className="text-xs font-bold text-gray-700">{success}</p>

            <div className="w-full bg-white border border-gray-200 rounded p-2.5 text-left text-xs text-gray-700 space-y-1 mt-0.5">
              <div><span className="font-bold">Kit:</span> {kitData?.NOMBREARTICULO}</div>
              <div><span className="font-bold">Código:</span> {kitData?.CODARTICULOAPLICACION}</div>
              <div><span className="font-bold">Cantidad Montada:</span> {cantidadInput} unidades</div>
              <div><span className="font-bold">Ubicación Origen:</span> {origenData?.UBICACION}</div>
              <div><span className="font-bold">Ubicación Destino:</span> {destinoDiferente && destinoData ? destinoData.UBICACION : origenData?.UBICACION}</div>
              {numeroLoteInput && <div><span className="font-bold">Lote:</span> {numeroLoteInput}</div>}
              {fechaCaducidadInput && <div><span className="font-bold">Caducidad:</span> {fechaCaducidadInput}</div>}
            </div>

            <div className="w-full flex flex-col gap-2 mt-1">
              <button
                onClick={resetProceso}
                className="w-full bg-sga-blue hover:bg-blue-800 text-white font-black py-2.5 rounded-lg shadow flex items-center justify-center gap-1.5 active:bg-blue-900 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>MONTAR OTRO KIT</span>
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

        {/* RESUMEN DE UBICACIÓN ORIGEN CONFIRMADA */}
        {step > 1 && origenData && (
          <div className="bg-white border border-gray-300 rounded px-2.5 py-1.5 flex items-center justify-between shadow-xs text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-4 h-4 text-sga-blue shrink-0" />
              <span className="text-gray-500 font-medium">Origen:</span>
              <span className="font-black text-sga-dark truncate">{origenData.UBICACION}</span>
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

        {/* RESUMEN DE KIT SELECCIONADO */}
        {step > 2 && kitData && (
          <div className="bg-white border border-gray-300 rounded px-2.5 py-1.5 flex items-center justify-between shadow-xs text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <Layers className="w-4 h-4 text-[#5c4033] shrink-0" />
              <div className="truncate">
                <span className="font-black text-sga-dark truncate block leading-tight">{kitData.NOMBREARTICULO}</span>
                <span className="text-[11px] font-mono text-gray-500">Cód: {kitData.CODARTICULOAPLICACION}</span>
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

        {/* ===== PASO 1: ENTRADA DE UBICACIÓN ORIGEN ===== */}
        {step === 1 && (
          <div className="bg-white border border-gray-300 rounded-lg p-2.5 sm:p-3 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-sga-dark border-b pb-1.5">
              <MapPin className="w-4 h-4 text-sga-blue" />
              <h3 className="font-black text-xs uppercase">Escanee Ubicación de Origen</h3>
            </div>
            <p className="text-xs text-gray-600">
              Indique la ubicación donde se encuentran los componentes del kit.
            </p>
            <input 
              ref={origenRef}
              type="text"
              inputMode={isKeyboardOpen ? "text" : "none"}
              value={origenInput}
              onChange={(e) => setOrigenInput(e.target.value)}
              onKeyDown={handleOrigenKeyDown}
              disabled={loading}
              placeholder="Escanee ubicación origen..."
              className="w-full border-2 border-gray-300 p-2.5 rounded-lg text-base font-bold focus:border-sga-blue focus:outline-none"
            />
            <button
              onClick={() => handleOrigenKeyDown({ key: 'Enter' })}
              disabled={loading || !origenInput.trim()}
              className="w-full bg-sga-blue hover:bg-blue-800 disabled:opacity-50 text-white font-black py-2.5 rounded-lg shadow text-sm"
            >
              {loading ? 'VALIDANDO...' : 'CONFIRMAR UBICACIÓN'}
            </button>
          </div>
        )}

        {/* ===== PASO 2: ENTRADA DE ARTÍCULO KIT ===== */}
        {step === 2 && (
          <div className="bg-white border border-gray-300 rounded-lg p-2 shadow-xs flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-sga-dark border-b pb-1">
              <Layers className="w-4 h-4 text-[#5c4033]" />
              <h3 className="font-black text-xs uppercase">Buscar Artículo Kit</h3>
            </div>
            <ArticleSearchInput 
              autoFocus 
              compact={true}
              onArticleSelected={handleArticleSelected}
              disabled={loading}
              placeholder="Escanear o buscar kit a montar..."
            />
          </div>
        )}

        {/* ===== PASO 3: CANTIDAD Y COMPONENTES ===== */}
        {step === 3 && (
          <div className="flex flex-col gap-2">
            {/* SELECTOR ERGONÓMICO DE CANTIDAD */}
            <div className="bg-white border border-gray-300 rounded-lg p-2.5 shadow-xs flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-black uppercase text-gray-700">Cantidad a Montar</label>
                <span className="font-bold text-gray-500">
                  Máximo posible: <b className="text-sga-blue font-black">{maxKitsPosibles}</b>
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
                  max={maxKitsPosibles > 0 ? maxKitsPosibles : undefined}
                  step="1"
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleValidarCantidad(); }}
                  disabled={loading}
                  className="flex-1 h-11 border-2 border-gray-300 rounded-lg text-xl font-black text-center focus:border-sga-blue focus:outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={() => setCantidadInput(prev => {
                    const current = parseFloat(prev) || 0;
                    if (maxKitsPosibles > 0 && current >= maxKitsPosibles) return prev;
                    return (current + 1).toString();
                  })}
                  className="w-11 h-11 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-black text-xl flex items-center justify-center text-gray-700 active:scale-95 shrink-0"
                >
                  +
                </button>
              </div>
            </div>

            {/* TABLA DE COMPONENTES */}
            <div className="bg-white border border-gray-300 rounded-lg p-2.5 shadow-xs flex flex-col gap-1.5">
              <h4 className="text-xs font-black uppercase text-gray-700 border-b pb-1">
                Componentes Requeridos en Ubicación
              </h4>
              <div className="flex flex-col gap-1.5 max-h-48 sm:max-h-60 overflow-y-auto">
                {componentes.map((comp) => {
                  const unidadesNecesarias = cantNumerica * comp.UNIDADES;
                  const suficiente = comp.STOCK_DISPONIBLE >= unidadesNecesarias;
                  return (
                    <div 
                      key={comp.CODARTICULO} 
                      className={`p-1.5 rounded border flex flex-col gap-0.5 text-xs ${
                        suficiente ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-300 text-red-900'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold truncate max-w-[200px]">{comp.NOMBREARTICULO}</span>
                        <span className="font-mono text-gray-500 text-[11px]">{comp.CODARTICULOAPLICACION}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Ratio: {comp.UNIDADES} ud/kit</span>
                        <span>
                          Nec: <b>{unidadesNecesarias}</b> / Disp: <b>{comp.STOCK_DISPONIBLE}</b>
                        </span>
                        <span className={`font-black ${suficiente ? 'text-green-600' : 'text-red-600'}`}>
                          {suficiente ? '✓ OK' : '✗ Falta'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleValidarCantidad}
              disabled={loading || cantNumerica <= 0}
              className="w-full bg-sga-blue hover:bg-blue-800 disabled:opacity-50 text-white font-black py-3 rounded-lg shadow text-sm active:bg-blue-900"
            >
              {loading ? 'VALIDANDO...' : 'CONTINUAR'}
            </button>
          </div>
        )}

        {/* ===== PASO 4: TRAZABILIDAD Y DESTINO ===== */}
        {step === 4 && (
          <div className="bg-white border border-gray-300 rounded-lg p-2.5 shadow-xs flex flex-col gap-2.5">
            <h3 className="font-black text-xs uppercase text-sga-dark border-b pb-1">
              Datos del Kit y Destino
            </h3>

            {/* FECHA DE CADUCIDAD (SI APLICA) */}
            {kitData?.GESTIONARCADUCIDAD !== 0 ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sga-blue" />
                  Fecha de Caducidad (Obligatoria):
                </label>
                <input 
                  type="date"
                  value={fechaCaducidadInput}
                  onChange={(e) => setFechaCaducidadInput(e.target.value)}
                  disabled={loading}
                  className="w-full border-2 border-gray-300 p-2 rounded-lg text-sm font-bold focus:border-sga-blue focus:outline-none"
                />
              </div>
            ) : null}

            {/* NÚMERO DE LOTE (SI APLICA) */}
            {kitData?.PRM_TRAZABILIDAD !== 0 ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-sga-blue" />
                  Número de Lote (Obligatorio):
                </label>
                <input 
                  type="text"
                  placeholder="Introduzca o escanee lote..."
                  value={numeroLoteInput}
                  onChange={(e) => setNumeroLoteInput(e.target.value)}
                  disabled={loading}
                  className="w-full border-2 border-gray-300 p-2 rounded-lg text-sm font-bold focus:border-sga-blue focus:outline-none uppercase"
                />
              </div>
            ) : null}

            {/* UBICACIÓN DESTINO */}
            <div className="border-t border-gray-200 pt-1.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">Ubicación Destino del Kit</label>
                <button
                  type="button"
                  onClick={() => {
                    setDestinoDiferente(!destinoDiferente);
                    setDestinoData(null);
                    setDestinoInput('');
                  }}
                  className="text-xs text-sga-blue font-bold hover:underline"
                >
                  {destinoDiferente ? 'Dejar en Origen' : 'Cambiar Destino'}
                </button>
              </div>

              {!destinoDiferente ? (
                <div className="bg-gray-100 p-2 rounded text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  <span>Misma que origen ({origenData?.UBICACION})</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <input 
                    ref={destinoRef}
                    type="text"
                    inputMode={isKeyboardOpen ? "text" : "none"}
                    placeholder="Escanee ubicación destino..."
                    value={destinoInput}
                    onChange={(e) => setDestinoInput(e.target.value)}
                    onKeyDown={handleDestinoKeyDown}
                    disabled={loading}
                    className="w-full border-2 border-gray-300 p-2 rounded-lg text-sm font-bold focus:border-sga-blue focus:outline-none"
                  />
                  {destinoData && (
                    <div className="bg-green-50 border border-green-300 text-green-800 p-1.5 rounded text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-green-600" />
                      <span>Destino confirmado: {destinoData.UBICACION}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BOTÓN CONFIRMAR MONTAJE */}
            <button
              onClick={handleConfirmarMontaje}
              disabled={loading || (destinoDiferente && !destinoData)}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black py-3 rounded-lg shadow text-base flex items-center justify-center gap-2 active:bg-green-800 mt-1"
            >
              {loading ? 'PROCESANDO...' : 'CONFIRMAR Y MONTAR KIT'}
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
