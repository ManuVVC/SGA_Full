import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackageCheck, AlertCircle, RefreshCw, ChevronRight, ChevronLeft,
  CheckCircle, Box, MapPin, Hash, AlertTriangle, X, List,
  ScanLine, Scale, Info, Trash2, Zap, Plus, Minus, Smartphone
} from 'lucide-react';

import TerminalHeader from '../components/TerminalHeader';
import ArticleSearchInput from '../components/ArticleSearchInput';
import { formatFechaES } from '../utils/dateUtils';
import ConfirmDialog from '../components/ConfirmDialog';
import WizardBottomBar from '../components/WizardBottomBar';
import { useLongPress } from '../hooks/useLongPress';
import { useKeyboard } from '../contexts/KeyboardContext';
import { useDeviceScreen } from '../hooks/useDeviceScreen';
import { parseGs1 } from '../utils/gs1Parser';
import LineaUtilidadesModal from '../components/LineaUtilidadesModal';
import { usePreparacionPedido, FASE } from '../hooks/usePreparacionPedido';

/**
 * Teclado táctil numérico/código encuadrado en la columna derecha de los modales horizontales.
 * Evita que el teclado flotante del sistema operativo tape los campos de introducción (situados a la izquierda)
 * y mantiene el foco activo en el input para que el lector láser de anillo funcione en todo momento.
 */
const HorizontalKeypad = ({
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
  extraKey = '.',
  submitLabel = 'OK',
  disabled = false
}) => {
  const preventFocusLoss = (e) => e.preventDefault();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-1.5 flex flex-col justify-between gap-1 h-full select-none shadow-inner">
      <div className="grid grid-cols-3 gap-1 flex-1 min-h-0">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onMouseDown={preventFocusLoss}
            onClick={() => onDigit(k)}
            className="bg-white hover:bg-blue-50 active:bg-blue-100 border border-slate-300 rounded-lg font-black text-base sm:text-lg text-slate-800 shadow-sm active:scale-95 transition-transform flex items-center justify-center"
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || !extraKey}
          onMouseDown={preventFocusLoss}
          onClick={() => extraKey && onDigit(extraKey)}
          className="bg-slate-200 hover:bg-slate-300 active:bg-slate-400 border border-slate-300 rounded-lg font-black text-base sm:text-lg text-slate-700 shadow-sm active:scale-95 transition-transform flex items-center justify-center disabled:opacity-40"
        >
          {extraKey || ''}
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={() => onDigit('0')}
          className="bg-white hover:bg-blue-50 active:bg-blue-100 border border-slate-300 rounded-lg font-black text-base sm:text-lg text-slate-800 shadow-sm active:scale-95 transition-transform flex items-center justify-center"
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={onBackspace}
          className="bg-amber-100 hover:bg-amber-200 active:bg-amber-300 border border-amber-300 rounded-lg font-black text-sm sm:text-base text-amber-900 shadow-sm active:scale-95 transition-transform flex items-center justify-center"
          title="Borrar último carácter"
        >
          ⌫
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1 shrink-0">
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={onClear}
          className="col-span-1 py-1.5 bg-red-100 hover:bg-red-200 active:bg-red-300 border border-red-300 text-red-800 rounded-lg font-black text-[11px] shadow-sm active:scale-95 transition-transform"
        >
          BORRAR
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={preventFocusLoss}
          onClick={onSubmit}
          className="col-span-2 py-1.5 bg-sga-primary hover:bg-blue-800 active:bg-blue-900 text-white rounded-lg font-black text-xs sm:text-sm shadow flex items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          <span>↵ {submitLabel}</span>
        </button>
      </div>
    </div>
  );
};

const PreparaPedido = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const loteScanRef = useRef(null);
  const articleControlRef = useRef(null);
  const { isKeyboardOpen } = useKeyboard();
  const { isShortScreen, isVeryShortScreen, isLandscape } = useDeviceScreen();

  // Permite que el modo horizontal se active automáticamente al girar/usar pantalla de antebrazo,
  // o que el operario/técnico lo alterne manualmente con 1 toque desde la barra superior.
  const [modoHorizontalManual, setModoHorizontalManual] = useState(null);
  const isHorizontal = modoHorizontalManual !== null ? modoHorizontalManual : isLandscape;

  const [filtroLoteScan, setFiltroLoteScan] = useState('');

  const {
    fase, setFase,
    faseAnterior, setFaseAnterior,
    isStepModalOpen, setIsStepModalOpen,
    mismaUbicacionMantenida,
    showPosicionModal, setShowPosicionModal,
    posicionesDisponibles,
    cabecera,
    lineaActual,
    lineasPendientes,
    permisos,
    error, setError,
    loading,
    showExitModal, setShowExitModal,
    inputVal, setInputVal,
    cantidad, setCantidad,
    ubicacionConfirmada,
    lotesDisponibles,
    loteSeleccionado,
    cantidadPendiente,
    factorEanSeleccionado,
    unidadesYaPreparadas,
    stockDisponibleActual,
    cantidadPendienteLinea,
    cantidadSugeridaInput,
    lineaParaUtilidades,
    showUtilidadesModal, setShowUtilidadesModal,
    lineaParaDescargar, setLineaParaDescargar,
    recorridoDescarga, setRecorridoDescarga,
    loadingDescarga,
    registrosAAnular, setRegistrosAAnular,
    handleLongPressLinea,
    handleAbrirDescarga,
    handleConfirmarDescarga,
    getStepNumber,
    inicializar,
    comenzarPreparacion,
    seleccionarLinea,
    navegarLinea,
    handleConfirmarUbicacion,
    handleConfirmarArticulo,
    handleSeleccionarLote,
    handleConfirmarCantidad,
    ejecutarCarga,
    handleSumaSustitucion,
    irAPaso
  } = usePreparacionPedido(inputRef);

  // Auto-foco inteligente al abrirse o cambiar el modal de paso
  useEffect(() => {
    if (!isStepModalOpen) return;
    setFiltroLoteScan('');
    const timer = setTimeout(() => {
      if (fase === FASE.SELECCIONAR_LOTE && loteScanRef.current) {
        loteScanRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
        if (fase === FASE.INTRODUCIR_CANTIDAD && inputRef.current.select) {
          inputRef.current.select();
        }
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [fase, isStepModalOpen, showPosicionModal, isKeyboardOpen, isHorizontal]);

  // Re-enfocar automáticamente el input del modal activo si el operario toca fuera por error
  const handleModalContainerClick = useCallback((e) => {
    const tag = e.target?.tagName;
    if (tag !== 'INPUT' && tag !== 'BUTTON' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
      setTimeout(() => {
        if (fase === FASE.SELECCIONAR_LOTE && loteScanRef.current) {
          loteScanRef.current.focus();
        } else if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [fase]);

  useEffect(() => { inicializar(); }, []);

  // Gestión de escaneo directo de lote en el modal de lotes
  const handleScanLoteSubmit = (e) => {
    e.preventDefault();
    const raw = filtroLoteScan.trim();
    if (!raw) {
      if (lotesDisponibles.length > 0) {
        handleSeleccionarLote(lotesDisponibles[0]);
      }
      return;
    }
    const gs1 = parseGs1(raw);
    const buscado = (gs1.isGs1 && gs1.lote ? gs1.lote : raw).trim().toUpperCase();
    const encontrado = lotesDisponibles.find(
      l => String(l.numerolote || l.codnumerolote || '').trim().toUpperCase() === buscado
    );
    if (encontrado) {
      setFiltroLoteScan('');
      handleSeleccionarLote(encontrado);
    } else {
      setError(`El lote "${buscado}" no existe en esta ubicación.`);
      setFiltroLoteScan('');
    }
  };

  // Ajuste rápido con botones +/- en el modal de cantidad
  const ajustarCantidad = (delta) => {
    const actual = parseFloat(String(cantidad || cantidadSugeridaInput || 0).replace(',', '.')) || 0;
    const nuevo = Math.max(0, Math.round((actual + delta) * 1000) / 1000);
    setCantidad(String(nuevo));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const stepActual = getStepNumber(fase);
  const requiereLote = Boolean(lineaActual?.prm_trazabilidad || lineaActual?.gestionar_caducidad);
  const numLineasPendientes = lineasPendientes.filter(l => l.completada === 0).length;

  const navItems = [
    {
      label: 'ANT',
      icon: <ChevronLeft size={isHorizontal ? 20 : 22} />,
      onClick: () => navegarLinea(1),
      disabled: loading,
      variant: 'default',
    },
    {
      label: 'Líneas',
      icon: <List size={isHorizontal ? 20 : 22} />,
      onClick: () => { setFaseAnterior(fase); setFase(FASE.VER_LINEAS); },
      disabled: loading,
      variant: 'info',
    },
    {
      label: 'SIG',
      icon: <ChevronRight size={isHorizontal ? 20 : 22} />,
      onClick: () => navegarLinea(0),
      disabled: loading,
      variant: 'default',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-sga-light overflow-hidden select-none">
      <TerminalHeader title="PREPARA PEDIDO" />

      {/* ── BARRA SUPERIOR COMPACTA ── */}
      {fase !== FASE.CARGANDO && fase !== FASE.SIN_DOCUMENTO && fase !== FASE.SIN_LINEAS && (
        <div className="bg-white px-2 py-1 border-b flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-1.5">
            {fase === FASE.VER_LINEAS ? (
              <button
                type="button"
                onClick={() => setFase(faseAnterior || (lineaActual ? FASE.INTRODUCIR_CANTIDAD : FASE.CABECERA))}
                className="flex items-center gap-1 px-2 py-1 bg-sga-primary text-white rounded text-xs font-bold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => (fase === FASE.CABECERA ? navigate('/prepara') : setShowExitModal(true))}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded text-sga-dark transition-colors text-xs font-bold"
              >
                <ChevronLeft className="w-4 h-4 text-sga-primary" />
                <span>Salir</span>
              </button>
            )}

            {cabecera && (
              <div className="flex items-center gap-1 text-xs font-bold text-gray-600 truncate">
                <span className="bg-blue-50 text-sga-primary px-1.5 py-0.5 rounded border border-blue-200">
                  Doc: {cabecera.num_documento}
                </span>
                {cabecera.particion !== undefined && (
                  <span className="text-gray-400 hidden sm:inline">P:{cabecera.particion}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Conmutador rápido de modo Antebrazo (Horizontal) / Mano (Vertical) */}
            <button
              type="button"
              onClick={() => setModoHorizontalManual(prev => (prev === null ? !isLandscape : !prev))}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                isHorizontal
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}
              title="Alternar disposición Antebrazo (Horizontal) / Mano (Vertical)"
            >
              <Smartphone size={12} className={isHorizontal ? 'rotate-90 text-amber-700' : ''} />
              <span>{isHorizontal ? 'Antebrazo (H)' : 'Mano (V)'}</span>
            </button>

            {stepActual >= 1 && (
              <>
                <button
                  type="button"
                  onClick={() => { setFaseAnterior(fase); setFase(FASE.VER_LINEAS); }}
                  className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200 shadow-sm"
                >
                  <List size={13} />
                  <span>{numLineasPendientes} pdtes.</span>
                </button>
                {lineaActual && (
                  <button
                    type="button"
                    onClick={() => handleLongPressLinea(lineaActual)}
                    className="bg-gray-100 hover:bg-sga-primary text-gray-600 hover:text-white p-1.5 rounded transition-colors shadow-sm"
                    title="Utilidades de la línea"
                  >
                    <Info size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ÁREA CENTRAL (En modo Horizontal incluye el Dock Lateral Derecho para navegación) ── */}
      <div className={`flex-1 flex ${isHorizontal && stepActual >= 1 ? 'flex-row' : 'flex-col'} overflow-hidden relative`}>
        <div className={`p-2 flex-1 flex flex-col ${stepActual >= 1 ? 'overflow-hidden justify-between' : 'overflow-y-auto'} gap-2`}>
          {/* Error en pantalla base */}
          {error && (!isStepModalOpen || stepActual === 0) && (
            <div className="shrink-0 bg-red-100 border border-red-400 text-red-700 p-2 rounded flex items-start gap-2 text-xs shadow-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="font-semibold flex-1">{error}</span>
              <button onClick={() => setError(null)}><X size={16} /></button>
            </div>
          )}

          {/* ── CARGANDO ── */}
          {fase === FASE.CARGANDO && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500">
              <RefreshCw size={40} className="animate-spin text-sga-primary" />
              <p className="font-semibold">Cargando...</p>
            </div>
          )}

          {/* ── SIN DOCUMENTO ── */}
          {fase === FASE.SIN_DOCUMENTO && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500">
              <PackageCheck size={48} className="text-gray-300" />
              <p className="font-bold text-base text-center text-gray-600">No hay documentos pendientes de preparar</p>
              <div className="flex gap-3">
                <button onClick={inicializar} className="bg-sga-primary text-white font-bold px-5 py-2.5 rounded flex items-center gap-2 text-sm">
                  <RefreshCw size={16} /> REINTENTAR
                </button>
                <button onClick={() => navigate('/prepara')} className="bg-gray-200 text-gray-700 font-bold px-5 py-2.5 rounded text-sm">
                  Volver
                </button>
              </div>
            </div>
          )}

          {/* ── CABECERA (Adaptada a 2 columnas en modo Antebrazo Horizontal) ── */}
          {fase === FASE.CABECERA && cabecera && (
            <div className={`flex-1 ${isHorizontal ? 'grid grid-cols-12 gap-3 items-stretch overflow-hidden' : 'flex flex-col gap-3 overflow-y-auto'}`}>
              <div className={`${isHorizontal ? 'col-span-8 flex flex-col justify-between gap-2 overflow-y-auto' : 'flex flex-col gap-3'}`}>
                <div className="bg-white rounded-lg border border-sga-primary shadow-sm p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-sga-primary uppercase tracking-wider">Pedido Asignado</span>
                    <span className="bg-sga-primary text-white text-xs font-bold px-2 py-0.5 rounded">
                      Doc: {cabecera.num_documento} - Part: {cabecera.particion}
                    </span>
                  </div>
                  <div className="text-base font-black text-gray-800 leading-tight">
                    {cabecera.cod_cliente} - {cabecera.nombre_comercial || cabecera.razon_social || 'Cliente Desconocido'}
                  </div>
                </div>

                {cabecera.observaciones && (
                  <div className="bg-orange-50 text-orange-800 text-xs px-3 py-2 rounded-lg border border-orange-200 flex gap-2 items-start">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-orange-500" />
                    <span className="font-medium line-clamp-2">{cabecera.observaciones}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 border border-blue-100 rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Líneas</span>
                    <span className="text-lg font-black text-blue-700 leading-none mt-0.5">{cabecera.num_lineas || 0}</span>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">Cajas</span>
                    <span className="text-lg font-black text-purple-700 leading-none mt-0.5">{cabecera.total_cajas || 0}</span>
                  </div>
                  <div className="bg-teal-50 border border-teal-100 rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-teal-500 font-bold uppercase tracking-wider">Volumen</span>
                    <span className="text-lg font-black text-teal-700 leading-none mt-0.5">{cabecera.volumen || 0}</span>
                  </div>
                </div>
              </div>

              <div className={`${isHorizontal ? 'col-span-4 flex flex-col justify-center gap-2' : 'mt-auto shrink-0 flex flex-col gap-2'}`}>
                <button
                  onClick={comenzarPreparacion}
                  disabled={loading}
                  className={`w-full bg-sga-success hover:bg-green-700 text-white font-black rounded-lg text-lg flex items-center justify-center gap-2 shadow ${
                    isHorizontal ? 'flex-1 py-4' : 'py-3.5'
                  }`}
                >
                  <PackageCheck size={22} /> COMENZAR
                </button>
                <button
                  onClick={() => navigate('/prepara')}
                  disabled={loading}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 shadow transition-colors"
                >
                  VOLVER
                </button>
              </div>
            </div>
          )}

          {/* ── DASHBOARD BASE DE LÍNEA ACTIVA (ZERO-SCROLL) ──
              En Vertical: Arriba Ficha, Abajo Stepper + CTA.
              En Horizontal (Antebrazo): Izquierda Ficha (7 cols), Derecha Stepper 2x2 + CTA (5 cols).
          ── */}
          {stepActual >= 1 && lineaActual && (
            <div className={`flex-1 overflow-hidden ${
              isHorizontal
                ? 'grid grid-cols-12 gap-2.5 items-stretch'
                : 'flex flex-col justify-between gap-2'
            }`}>
              {/* Zona Izquierda / Superior: Tarjeta Principal Consolidada */}
              <div className={isHorizontal ? 'col-span-7 flex flex-col h-full overflow-hidden' : ''}>
                <PanelInfoCard
                  lineaActual={lineaActual}
                  ubicacionConfirmada={ubicacionConfirmada}
                  mismaUbicacionMantenida={mismaUbicacionMantenida}
                  loteSeleccionado={loteSeleccionado}
                  factorEanSeleccionado={factorEanSeleccionado}
                  compact={isShortScreen || isHorizontal}
                  isHorizontal={isHorizontal}
                  onLongPress={handleLongPressLinea}
                />
              </div>

              {/* Zona Derecha / Inferior: Stepper Interactivo + Botón de Acción Principal */}
              <div className={`bg-white rounded-xl border border-gray-200 p-2 shadow-sm flex flex-col justify-between gap-2 ${
                isHorizontal ? 'col-span-5 h-full' : 'shrink-0'
              }`}>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                  <span>Pasos de Lectura</span>
                  {loading && <RefreshCw size={12} className="animate-spin text-sga-primary" />}
                </div>

                <div className={`grid ${isHorizontal ? 'grid-cols-2 gap-1.5 flex-1' : 'grid-cols-4 gap-1.5'}`}>
                  <StepChip
                    label="1. Ubic."
                    subLabel={ubicacionConfirmada ? (ubicacionConfirmada.codhueco || 'OK') : 'Pendiente'}
                    icon={<MapPin size={13} />}
                    active={fase === FASE.CONFIRMAR_UBICACION}
                    completed={Boolean(ubicacionConfirmada)}
                    onClick={() => irAPaso(FASE.CONFIRMAR_UBICACION)}
                  />

                  <StepChip
                    label="2. Artíc."
                    subLabel={stepActual > 2 ? (lineaActual.codarticuloaplicacion || 'OK') : 'Escanear'}
                    icon={<Box size={13} />}
                    active={fase === FASE.CONFIRMAR_ARTICULO}
                    completed={stepActual > 2}
                    disabled={!ubicacionConfirmada}
                    onClick={() => irAPaso(FASE.CONFIRMAR_ARTICULO)}
                  />

                  <StepChip
                    label="3. Lote"
                    subLabel={
                      !requiereLote
                        ? 'No aplica'
                        : loteSeleccionado
                          ? (loteSeleccionado.numerolote || loteSeleccionado.codnumerolote || 'OK')
                          : 'Elegir'
                    }
                    icon={<Hash size={13} />}
                    active={fase === FASE.SELECCIONAR_LOTE}
                    completed={!requiereLote ? stepActual >= 3 : Boolean(loteSeleccionado)}
                    disabled={!requiereLote || !ubicacionConfirmada || lotesDisponibles.length === 0}
                    onClick={() => requiereLote && irAPaso(FASE.SELECCIONAR_LOTE)}
                  />

                  <StepChip
                    label="4. Cant."
                    subLabel={`${cantidadPendienteLinea} uds`}
                    icon={<Scale size={13} />}
                    active={fase === FASE.INTRODUCIR_CANTIDAD || stepActual === 5}
                    completed={false}
                    disabled={!ubicacionConfirmada || lotesDisponibles.length === 0}
                    onClick={() => irAPaso(FASE.INTRODUCIR_CANTIDAD)}
                  />
                </div>

                {/* Botón grande para reabrir el popup si el operario lo minimizó */}
                <button
                  type="button"
                  onClick={() => setIsStepModalOpen(true)}
                  className={`w-full bg-sga-primary hover:bg-blue-800 active:bg-blue-900 text-white font-black rounded-lg shadow flex items-center justify-center gap-2 text-xs sm:text-sm transition-all ${
                    isHorizontal ? 'py-2.5' : 'py-3'
                  }`}
                >
                  <ScanLine size={16} className="shrink-0" />
                  <span className="truncate">
                    {fase === FASE.CONFIRMAR_UBICACION && 'ESCANEAR UBICACIÓN'}
                    {fase === FASE.CONFIRMAR_ARTICULO && 'ESCANEAR ARTÍCULO'}
                    {fase === FASE.SELECCIONAR_LOTE && 'SELECCIONAR LOTE'}
                    {fase === FASE.INTRODUCIR_CANTIDAD && 'INTRODUCIR CANTIDAD'}
                    {(fase === FASE.CONFIRMAR_EXCESO || fase === FASE.CONFIRMAR_SUMA_SUSTITUCION) && 'CONFIRMACIÓN PENDIENTE'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── VER LÍNEAS (En Horizontal se divide en 2 columnas lado a lado: Pendientes | Preparadas) ── */}
          {fase === FASE.VER_LINEAS && (
            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded p-2">
              {(() => {
                const pendientes = lineasPendientes.filter(l => l.completada === 0);
                const preparadas = lineasPendientes.filter(l => l.completada === 1);

                return (
                  <div className={`flex-1 overflow-hidden ${
                    isHorizontal ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3 overflow-y-auto'
                  }`}>
                    {/* Columna Pendientes */}
                    <div className={`flex flex-col ${isHorizontal ? 'overflow-hidden h-full' : ''}`}>
                      <h4 className="font-bold text-gray-700 bg-gray-100 p-1 px-2 rounded mb-1.5 shadow-sm text-xs shrink-0">
                        Pendientes ({pendientes.length})
                      </h4>
                      <div className={`flex flex-col gap-1.5 ${isHorizontal ? 'overflow-y-auto flex-1 pr-1' : ''}`}>
                        {pendientes.length === 0 ? (
                          <p className="text-xs text-gray-400 italic p-2">Sin líneas pendientes</p>
                        ) : pendientes.map(lin => {
                          const stock = lin.stocktotal || 0;
                          const outOfStock = stock <= 0;
                          return (
                            <LineaPendienteRow
                              key={lin.numlinea}
                              lin={lin}
                              outOfStock={outOfStock}
                              onSelect={seleccionarLinea}
                              onLongPress={handleLongPressLinea}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Columna Preparadas */}
                    <div className={`flex flex-col ${isHorizontal ? 'overflow-hidden h-full' : ''}`}>
                      <h4 className="font-bold text-sga-success bg-green-50 border border-green-200 p-1 px-2 rounded mb-1.5 shadow-sm text-xs shrink-0">
                        Preparadas ({preparadas.length})
                      </h4>
                      <div className={`flex flex-col gap-1.5 opacity-85 ${isHorizontal ? 'overflow-y-auto flex-1 pr-1' : ''}`}>
                        {preparadas.length === 0 ? (
                          <p className="text-xs text-gray-400 italic p-2">Aún no hay líneas preparadas</p>
                        ) : preparadas.map(lin => (
                          <div key={lin.numlinea} className="border border-green-200 rounded p-2 text-sm shadow-sm bg-green-50 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <LineaPendienteRow
                                lin={lin}
                                outOfStock={false}
                                onSelect={() => {}}
                                onLongPress={handleLongPressLinea}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAbrirDescarga(lin)}
                              className="shrink-0 bg-red-100 hover:bg-red-200 text-red-600 rounded p-2 transition-colors"
                              title="Anular preparación"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── FIN ── */}
          {fase === FASE.SIN_LINEAS && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <CheckCircle size={56} className="text-sga-success" />
              <p className="text-lg font-black text-center px-4">
                Preparación completada<br />
                <span className="text-sm text-gray-500 font-medium">No quedan líneas pendientes</span>
              </p>
              <button
                onClick={() => navigate('/prepara')}
                className="bg-sga-success text-white font-bold py-3 px-10 rounded-lg text-base shadow-md hover:bg-green-700 transition-colors"
              >
                VOLVER A PEDIDOS
              </button>
            </div>
          )}
        </div>

        {/* ── NAVEGACIÓN ENTRE LÍNEAS:
            En modo Horizontal (Antebrazo) se monta como Dock Vertical a la derecha.
            En modo Vertical (Mano) se monta como barra inferior tradicional.
        ── */}
        {stepActual >= 1 && isHorizontal && (
          <WizardBottomBar items={navItems} vertical={true} />
        )}

        {/* =====================================================================
            POPUP / MODAL UNIFICADO DE LECTURA E INTRODUCCIÓN DE DATOS
            - En modo Vertical: Tarjeta centrada de 1 columna (max-w-md).
            - En modo Horizontal (Antebrazo): Panel encuadrado a pantalla completa del
              área de trabajo con Campos de Introducción a la IZQUIERDA (col-span-7)
              y Teclado Táctil acoplado a la DERECHA (col-span-5).
        ===================================================================== */}
        {stepActual >= 1 && lineaActual && isStepModalOpen && (
          <div
            onClick={handleModalContainerClick}
            className={
              isHorizontal
                ? 'absolute inset-0 z-30 bg-slate-200 p-1.5 flex items-stretch justify-center'
                : `fixed inset-0 z-40 bg-black/60 flex justify-center p-2 ${
                    isVeryShortScreen || isKeyboardOpen
                      ? 'items-start pt-1.5'
                      : 'items-start pt-5 sm:items-center'
                  }`
            }
          >
            <div className={`bg-white rounded-xl shadow-2xl w-full ${
              isHorizontal ? 'h-full border-2 border-slate-300' : 'max-w-md border border-gray-200'
            } overflow-hidden flex flex-col animate-fade-in`}>
              {/* Cabecera del Popup */}
              <div className={`px-3 ${isHorizontal ? 'py-1.5' : 'py-2'} text-white font-bold flex items-center justify-between shrink-0 ${
                fase === FASE.CONFIRMAR_EXCESO
                  ? 'bg-orange-500'
                  : fase === FASE.CONFIRMAR_SUMA_SUSTITUCION
                    ? 'bg-blue-600'
                    : 'bg-sga-primary'
              }`}>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  {fase === FASE.CONFIRMAR_UBICACION && <><MapPin size={15} /> <span>1. Escanear Ubicación</span></>}
                  {fase === FASE.CONFIRMAR_ARTICULO && <><Box size={15} /> <span>2. Escanear Artículo</span></>}
                  {fase === FASE.SELECCIONAR_LOTE && <><Hash size={15} /> <span>3. Seleccionar Lote</span></>}
                  {fase === FASE.INTRODUCIR_CANTIDAD && <><Scale size={15} /> <span>{requiereLote ? '4' : '3'}. Cantidad a Preparar</span></>}
                  {fase === FASE.CONFIRMAR_EXCESO && <><AlertTriangle size={15} /> <span>Exceso de Mercancía</span></>}
                  {fase === FASE.CONFIRMAR_SUMA_SUSTITUCION && <><AlertCircle size={15} /> <span>Mercancía en Carrito</span></>}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* En modo Horizontal permitimos cambiar Ant/Sig línea directamente desde la cabecera del modal */}
                  {isHorizontal && (
                    <div className="flex items-center gap-1 mr-1 border-r border-white/25 pr-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => navegarLinea(1)}
                        className="px-2 py-0.5 bg-white/15 hover:bg-white/25 rounded text-[11px] font-bold flex items-center gap-0.5"
                        title="Línea anterior"
                      >
                        <ChevronLeft size={13} /> Línea Ant
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => navegarLinea(0)}
                        className="px-2 py-0.5 bg-white/15 hover:bg-white/25 rounded text-[11px] font-bold flex items-center gap-0.5"
                        title="Siguiente línea"
                      >
                        Línea Sig <ChevronRight size={13} />
                      </button>
                    </div>
                  )}

                  {stepActual > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        if (fase === FASE.CONFIRMAR_EXCESO || fase === FASE.CONFIRMAR_SUMA_SUSTITUCION) {
                          setFase(FASE.INTRODUCIR_CANTIDAD);
                        } else if (fase === FASE.INTRODUCIR_CANTIDAD) {
                          if (requiereLote && lotesDisponibles.length > 1) {
                            setFase(FASE.SELECCIONAR_LOTE);
                          } else if (permisos.solicitar_articulo === -1) {
                            setFase(FASE.CONFIRMAR_ARTICULO);
                          } else if (permisos.solicitar_ubicacion === -1) {
                            setFase(FASE.CONFIRMAR_UBICACION);
                          }
                        } else if (fase === FASE.SELECCIONAR_LOTE) {
                          if (permisos.solicitar_articulo === -1) {
                            setFase(FASE.CONFIRMAR_ARTICULO);
                          } else if (permisos.solicitar_ubicacion === -1) {
                            setFase(FASE.CONFIRMAR_UBICACION);
                          }
                        } else if (fase === FASE.CONFIRMAR_ARTICULO && permisos.solicitar_ubicacion === -1) {
                          setFase(FASE.CONFIRMAR_UBICACION);
                        }
                      }}
                      className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-bold flex items-center gap-0.5"
                      title="Paso anterior"
                    >
                      <ChevronLeft size={14} /> Paso Ant.
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsStepModalOpen(false)}
                    className="p-0.5 hover:bg-white/20 rounded transition-colors"
                    title="Minimizar para ver ficha"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Banner de Error integrado dentro del Popup */}
              {error && (
                <div className="bg-red-100 border-b border-red-300 text-red-800 px-3 py-1 flex items-start gap-2 text-xs font-bold shrink-0">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
                  <span className="flex-1">{error}</span>
                  <button type="button" onClick={() => setError(null)} className="text-red-600"><X size={14} /></button>
                </div>
              )}

              {/* Cuerpo dinámico del Popup */}
              <div className={`${
                isHorizontal
                  ? 'p-2 flex-1 min-h-0 flex flex-col justify-center overflow-hidden'
                  : 'p-3 flex flex-col gap-2.5 overflow-y-auto max-h-[75vh]'
              }`}>

                {/* ── POPUP FASE 1: UBICACIÓN ── */}
                {fase === FASE.CONFIRMAR_UBICACION && (
                  <div className={isHorizontal ? 'grid grid-cols-12 gap-2.5 h-full items-stretch' : 'flex flex-col gap-2.5'}>
                    {/* IZQUIERDA (H) / ARRIBA+ABAJO (V): Objetivo + Campo de Introducción */}
                    <div className={isHorizontal ? 'col-span-7 flex flex-col justify-between gap-1.5 h-full' : 'flex flex-col gap-2.5'}>
                      <div className={`bg-blue-50 border-2 border-blue-200 rounded-lg ${isHorizontal ? 'px-3 py-1.5 flex items-center justify-between gap-2' : 'p-2.5 text-center'}`}>
                        {isHorizontal ? (
                          <>
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">
                                Dirígete a la Ubicación
                              </span>
                              <span className="text-xl sm:text-2xl font-black text-sga-primary tracking-wide block leading-tight truncate">
                                {lineaActual.nombreubicacion || lineaActual.codhueco || lineaActual.descripcion || lineaActual.codubicacion}
                              </span>
                            </div>
                            <div className="text-right min-w-0 max-w-[48%] border-l border-blue-200 pl-2">
                              <span className="text-xs text-gray-800 font-black block truncate">
                                Ref: {lineaActual.codarticuloaplicacion}
                              </span>
                              <span className="text-[10px] text-gray-500 font-semibold truncate block">
                                {lineaActual.nombrearticulo}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                              Dirígete a la Ubicación
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-sga-primary tracking-wide block leading-tight mt-0.5">
                              {lineaActual.nombreubicacion || lineaActual.codhueco || lineaActual.descripcion || lineaActual.codubicacion}
                            </span>
                            <span className="text-xs text-gray-700 font-bold block mt-1">
                              Ref: {lineaActual.codarticuloaplicacion}
                            </span>
                            <span className="text-[11px] text-gray-500 truncate block">
                              {lineaActual.nombrearticulo}
                            </span>
                          </>
                        )}
                      </div>

                      {showPosicionModal ? (
                        <div className="flex flex-col gap-1.5 flex-1 justify-center">
                          <p className="text-xs font-bold text-center text-gray-700">
                            Selecciona la posición de la etiqueta:
                          </p>
                          <div className={`grid ${isHorizontal ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
                            {posicionesDisponibles.map((posObj, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleConfirmarUbicacion(posObj.POSICION)}
                                className="py-2 px-3 bg-gray-50 border-2 border-sga-primary rounded-lg text-center font-black text-sm text-sga-dark hover:bg-sga-primary hover:text-white active:scale-95 transition-all"
                              >
                                Pos {posObj.POSICION}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPosicionModal(false)}
                            className="w-full py-1.5 bg-gray-200 text-gray-700 rounded font-bold text-xs"
                          >
                            Volver a escanear ubicación
                          </button>
                        </div>
                      ) : (
                        <form
                          onSubmit={(e) => { e.preventDefault(); handleConfirmarUbicacion(); }}
                          className="flex flex-col gap-1.5 flex-1 justify-end"
                        >
                          <input
                            ref={inputRef}
                            id="inputUbi"
                            name="ubi"
                            type="text"
                            inputMode={!isHorizontal && isKeyboardOpen ? 'text' : 'none'}
                            autoComplete="off"
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            placeholder="Escanear ubicación o usar teclado ➔"
                            className={`w-full ${isHorizontal ? 'p-2.5 text-base' : 'p-3 text-lg'} border-2 border-sga-primary rounded-lg text-center font-black shadow-inner bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-300 tracking-wider text-gray-900 uppercase`}
                          />
                          <button
                            type="submit"
                            disabled={loading || !inputVal.trim()}
                            className={`w-full bg-sga-primary hover:bg-blue-800 text-white font-bold ${isHorizontal ? 'py-2.5' : 'py-3'} rounded-lg shadow flex items-center justify-center gap-2 disabled:opacity-50 transition-colors text-xs sm:text-sm`}
                          >
                            <ScanLine size={16} />
                            <span>{loading ? 'VALIDANDO...' : 'VALIDAR UBICACIÓN'}</span>
                          </button>
                        </form>
                      )}
                    </div>

                    {/* DERECHA (H): Teclado Táctil Encuadrado */}
                    {isHorizontal && (
                      <div className="col-span-5 h-full">
                        <HorizontalKeypad
                          disabled={loading || showPosicionModal}
                          extraKey="-"
                          submitLabel="VALIDAR"
                          onDigit={(d) => {
                            setInputVal((prev) => (prev + d).toUpperCase());
                            inputRef.current?.focus();
                          }}
                          onBackspace={() => {
                            setInputVal((prev) => prev.slice(0, -1));
                            inputRef.current?.focus();
                          }}
                          onClear={() => {
                            setInputVal('');
                            inputRef.current?.focus();
                          }}
                          onSubmit={() => {
                            if (inputVal.trim()) handleConfirmarUbicacion();
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── POPUP FASE 2: ARTÍCULO (CON SOPORTE GS1-128 FULL) ── */}
                {fase === FASE.CONFIRMAR_ARTICULO && (
                  <div className={isHorizontal ? 'grid grid-cols-12 gap-2.5 h-full items-stretch' : 'flex flex-col gap-2.5'}>
                    {/* IZQUIERDA (H) / ARRIBA+ABAJO (V): Info Artículo + Campos de Introducción */}
                    <div className={isHorizontal ? 'col-span-7 flex flex-col justify-between gap-1.5 h-full' : 'flex flex-col gap-2.5'}>
                      <div className="flex flex-col gap-1">
                        {mismaUbicacionMantenida && ubicacionConfirmada && (
                          <div className="bg-green-50 border border-green-200 text-green-800 px-2 py-0.5 rounded flex items-center justify-between text-[10px]">
                            <span className="font-bold flex items-center gap-1 truncate">
                              <CheckCircle size={11} className="text-green-600 shrink-0" />
                              Hueco: {lineaActual.nombreubicacion || ubicacionConfirmada.codhueco}
                            </span>
                            {permisos.solicitar_ubicacion === -1 && (
                              <button
                                type="button"
                                onClick={() => irAPaso(FASE.CONFIRMAR_UBICACION)}
                                className="underline font-bold text-green-900 ml-1 shrink-0"
                              >
                                Cambiar
                              </button>
                            )}
                          </div>
                        )}

                        <div className={`bg-blue-50 border-2 border-blue-200 rounded-lg ${isHorizontal ? 'px-2.5 py-1.5' : 'p-2.5'}`}>
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[10px] font-bold text-blue-600 uppercase shrink-0">Recoger:</span>
                              <span className={`${isHorizontal ? 'text-base' : 'text-lg'} font-black text-gray-900 truncate`}>
                                Ref: {lineaActual.codarticuloaplicacion}
                              </span>
                            </div>
                            <span className="bg-sga-primary text-white text-xs font-black px-2 py-0.5 rounded shrink-0">
                              Pdte: {cantidadPendienteLinea} uds
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-gray-700 leading-tight truncate mt-0.5">
                            {lineaActual.nombrearticulo}
                          </div>
                        </div>
                      </div>

                      {/* Campo de Introducción y Selector de Tipo a la IZQUIERDA */}
                      <div className="w-full">
                        <ArticleSearchInput
                          onArticleSelected={handleConfirmarArticulo}
                          mode="full"
                          compact={true}
                          suppressNumericKeyboard={isHorizontal}
                          controlRef={articleControlRef}
                          disabled={loading}
                          autoFocus={true}
                          placeholder="Escanear EAN / GS1-128..."
                        />
                      </div>
                    </div>

                    {/* DERECHA (H): Teclado Táctil Encuadrado */}
                    {isHorizontal && (
                      <div className="col-span-5 h-full">
                        <HorizontalKeypad
                          disabled={loading}
                          extraKey="-"
                          submitLabel="BUSCAR"
                          onDigit={(d) => articleControlRef.current?.appendChar(d)}
                          onBackspace={() => articleControlRef.current?.backspace()}
                          onClear={() => articleControlRef.current?.clear()}
                          onSubmit={() => articleControlRef.current?.submit()}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── POPUP FASE 3: SELECCIÓN / ESCANEO DE LOTE ── */}
                {fase === FASE.SELECCIONAR_LOTE && (
                  <div className={isHorizontal ? 'grid grid-cols-12 gap-2.5 h-full items-stretch' : 'flex flex-col gap-2'}>
                    {/* IZQUIERDA (H): Artículo + Escáner de Lote + Lista de Lotes */}
                    <div className={isHorizontal ? 'col-span-7 flex flex-col justify-between gap-1.5 h-full min-h-0' : 'flex flex-col gap-2'}>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 flex justify-between items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-gray-900 truncate">
                          Ref: {lineaActual.codarticuloaplicacion} — {lineaActual.nombrearticulo}
                        </span>
                        <span className="font-black text-xs text-sga-primary shrink-0">
                          Pdte: {cantidadPendienteLinea}
                        </span>
                      </div>

                      <form onSubmit={handleScanLoteSubmit} className="flex gap-1.5 shrink-0">
                        <input
                          ref={loteScanRef}
                          type="text"
                          inputMode={!isHorizontal && isKeyboardOpen ? 'text' : 'none'}
                          value={filtroLoteScan}
                          onChange={(e) => setFiltroLoteScan(e.target.value)}
                          placeholder="Escanear lote o Enter = 1º FEFO..."
                          className="flex-1 min-w-0 p-2 border-2 border-sga-primary rounded-lg text-xs font-bold bg-blue-50/40 focus:outline-none uppercase text-center"
                        />
                        {lotesDisponibles.length > 0 && (
                          <button
                            type="submit"
                            className="px-2.5 py-2 bg-sga-primary text-white rounded-lg font-bold text-[11px] shadow shrink-0"
                          >
                            1º FEFO
                          </button>
                        )}
                      </form>

                      <div className="flex-1 min-h-0 flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0">
                          Lotes en ubicación ({lotesDisponibles.length}) — Toca para elegir:
                        </div>
                        <ul className={`flex flex-col gap-1 overflow-y-auto pr-0.5 ${isHorizontal ? 'flex-1 min-h-0' : 'max-h-52'}`}>
                          {lotesDisponibles.map((lote, idx) => (
                            <li
                              key={idx}
                              onClick={() => handleSeleccionarLote(lote)}
                              className={`border-2 rounded-lg px-2.5 py-1.5 flex justify-between items-center cursor-pointer transition-all active:scale-[0.99] ${
                                idx === 0
                                  ? 'border-sga-primary bg-blue-50/60 shadow-sm'
                                  : 'border-gray-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-xs text-gray-900">
                                    Lote: {lote.numerolote || lote.codnumerolote || 'S/L'}
                                  </span>
                                  {idx === 0 && (
                                    <span className="bg-sga-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                      FEFO
                                    </span>
                                  )}
                                </div>
                                {lote.fechacaducidad && (
                                  <div className="text-[10px] font-semibold text-orange-600">
                                    Cad: {formatFechaES(lote.fechacaducidad)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-[9px] font-bold text-gray-400 uppercase">Stock</div>
                                <div className="font-black text-sm text-sga-primary leading-none">{lote.stock}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* DERECHA (H): Teclado Táctil Encuadrado para Lote */}
                    {isHorizontal && (
                      <div className="col-span-5 h-full">
                        <HorizontalKeypad
                          disabled={loading}
                          extraKey="-"
                          submitLabel="OK LOTE"
                          onDigit={(d) => {
                            setFiltroLoteScan((prev) => (prev + d).toUpperCase());
                            loteScanRef.current?.focus();
                          }}
                          onBackspace={() => {
                            setFiltroLoteScan((prev) => prev.slice(0, -1));
                            loteScanRef.current?.focus();
                          }}
                          onClear={() => {
                            setFiltroLoteScan('');
                            loteScanRef.current?.focus();
                          }}
                          onSubmit={(e) => handleScanLoteSubmit(e || { preventDefault: () => {} })}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── POPUP FASE 4: INTRODUCCIÓN DE CANTIDAD ── */}
                {fase === FASE.INTRODUCIR_CANTIDAD && (
                  <div className={isHorizontal ? 'grid grid-cols-12 gap-2.5 h-full items-stretch' : 'flex flex-col gap-2.5'}>
                    {/* IZQUIERDA (H) / ARRIBA+ABAJO (V): Métricas + Campos de Introducción + Confirmar */}
                    <div className={isHorizontal ? 'col-span-7 flex flex-col justify-between gap-1.5 h-full' : 'flex flex-col gap-2.5'}>
                      {/* Métricas compactas */}
                      <div className="flex flex-col gap-1">
                        <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-200 text-center">
                          <div className="bg-white py-1 px-2 rounded border border-blue-200 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-blue-600 uppercase">Pendiente</span>
                            <span className="text-base sm:text-lg font-black text-sga-primary leading-none">
                              {cantidadPendienteLinea} <span className="text-[10px] font-bold">uds</span>
                            </span>
                          </div>
                          <div className="bg-white py-1 px-2 rounded border border-gray-200 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-gray-500 uppercase">Stock Hueco</span>
                            <span className="text-base sm:text-lg font-black text-gray-700 leading-none">
                              {stockDisponibleActual} <span className="text-[10px] font-bold">uds</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          {loteSeleccionado && (
                            <div className="flex-1 flex items-center justify-between bg-orange-50 border border-orange-200 px-2 py-0.5 rounded text-[10px] min-w-0">
                              <span className="font-bold text-orange-900 truncate">
                                Lote: {loteSeleccionado.numerolote || loteSeleccionado.codnumerolote || 'S/L'}
                                {loteSeleccionado.fechacaducidad ? ` (${formatFechaES(loteSeleccionado.fechacaducidad)})` : ''}
                              </span>
                              {lotesDisponibles.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setFase(FASE.SELECCIONAR_LOTE)}
                                  className="text-orange-700 underline font-bold ml-1 shrink-0"
                                >
                                  Cambiar
                                </button>
                              )}
                            </div>
                          )}

                          {factorEanSeleccionado > 1 && (
                            <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-blue-200 shrink-0">
                              <AlertCircle size={12} />
                              <span>Caja x {factorEanSeleccionado}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Controles de Cantidad en la Izquierda */}
                      {permisos.solicitar_cantidad === -1 ? (
                        <div className="flex flex-col gap-1.5">
                          {/* Botón 1-Toque: Preparar Todo el Pendiente sin teclear */}
                          {cantidadSugeridaInput > 0 && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => {
                                setCantidad(String(cantidadSugeridaInput));
                                handleConfirmarCantidad(cantidadSugeridaInput);
                              }}
                              className={`w-full ${isHorizontal ? 'py-1.5 px-2.5' : 'py-2 px-3'} bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg shadow font-black text-xs flex items-center justify-between transition-all`}
                            >
                              <span className="flex items-center gap-1">
                                <Zap size={14} className="text-yellow-300 shrink-0" />
                                <span>PREPARAR PENDIENTE (1 TOQUE)</span>
                              </span>
                              <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                                {cantidadSugeridaInput} {factorEanSeleccionado > 1 ? `caj (${cantidadSugeridaInput * factorEanSeleccionado} uds)` : 'uds'}
                              </span>
                            </button>
                          )}

                          {/* Controles de Entrada Numérica con Botones Rápidos -1 / +1 */}
                          <div className="flex items-stretch gap-1.5">
                            <button
                              type="button"
                              onClick={() => ajustarCantidad(-1)}
                              className="px-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border border-gray-300 rounded-lg font-black text-gray-700 flex items-center justify-center"
                              title="Restar 1"
                            >
                              <Minus size={18} />
                            </button>

                            <input
                              ref={inputRef}
                              id="inputCantidad"
                              name="cantidad"
                              type="text"
                              inputMode={isHorizontal ? 'none' : 'decimal'}
                              autoComplete="off"
                              value={cantidad}
                              onChange={(e) => setCantidad(e.target.value.replace(/[^0-9.,]/g, ''))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (!cantidad && cantidadSugeridaInput > 0) {
                                    setCantidad(String(cantidadSugeridaInput));
                                    handleConfirmarCantidad(cantidadSugeridaInput);
                                  } else {
                                    handleConfirmarCantidad();
                                  }
                                }
                              }}
                              className={`flex-1 min-w-0 border-2 border-sga-primary rounded-lg ${isHorizontal ? 'py-1 text-2xl' : 'py-1.5 text-2xl sm:text-3xl'} px-2 text-center font-black text-sga-primary bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-300`}
                              placeholder={cantidadSugeridaInput > 0 ? String(cantidadSugeridaInput) : '0'}
                            />

                            <button
                              type="button"
                              onClick={() => ajustarCantidad(1)}
                              className="px-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border border-gray-300 rounded-lg font-black text-gray-700 flex items-center justify-center"
                              title="Sumar 1"
                            >
                              <Plus size={18} />
                            </button>
                          </div>

                          {factorEanSeleccionado > 1 && cantidad && !isNaN(parseFloat(String(cantidad).replace(',', '.'))) && (
                            <div className="text-center text-[11px] text-sga-primary font-black bg-blue-50 py-0.5 rounded border border-blue-100">
                              Total = {parseFloat(String(cantidad).replace(',', '.')) * factorEanSeleccionado} uds.
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (!cantidad && cantidadSugeridaInput > 0) {
                                setCantidad(String(cantidadSugeridaInput));
                                handleConfirmarCantidad(cantidadSugeridaInput);
                              } else {
                                handleConfirmarCantidad();
                              }
                            }}
                            disabled={loading || (!cantidad && cantidadSugeridaInput <= 0)}
                            className={`w-full bg-sga-success hover:bg-green-700 text-white font-black ${isHorizontal ? 'py-2' : 'py-3'} rounded-lg flex items-center justify-center gap-2 shadow disabled:opacity-50 text-xs sm:text-sm`}
                          >
                            <CheckCircle size={16} />
                            <span>
                              {loading
                                ? 'GUARDANDO...'
                                : cantidad
                                  ? `CONFIRMAR (${cantidad})`
                                  : `CONFIRMAR (${cantidadSugeridaInput})`}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="bg-green-50 border border-green-300 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-green-700 font-bold uppercase">Se preparará automáticamente</div>
                            <div className="text-2xl font-black text-sga-success">{cantidadPendienteLinea}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleConfirmarCantidad()}
                            disabled={loading}
                            className="w-full bg-sga-success text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow"
                          >
                            <CheckCircle size={18} /> CONFIRMAR
                          </button>
                        </div>
                      )}
                    </div>

                    {/* DERECHA (H): Teclado Numérico Táctil Encuadrado */}
                    {isHorizontal && (
                      <div className="col-span-5 h-full">
                        <HorizontalKeypad
                          disabled={loading || permisos.solicitar_cantidad !== -1}
                          extraKey="."
                          submitLabel="CONFIRMAR"
                          onDigit={(d) => {
                            setCantidad((prev) => {
                              const cur = String(prev || '');
                              if (d === '.' && (cur.includes('.') || cur.includes(','))) return cur;
                              return cur + d;
                            });
                            inputRef.current?.focus();
                          }}
                          onBackspace={() => {
                            setCantidad((prev) => String(prev || '').slice(0, -1));
                            inputRef.current?.focus();
                          }}
                          onClear={() => {
                            setCantidad('');
                            inputRef.current?.focus();
                          }}
                          onSubmit={() => {
                            if (!cantidad && cantidadSugeridaInput > 0) {
                              setCantidad(String(cantidadSugeridaInput));
                              handleConfirmarCantidad(cantidadSugeridaInput);
                            } else {
                              handleConfirmarCantidad();
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── POPUP FASE 5A: CONFIRMAR EXCESO ── */}
                {fase === FASE.CONFIRMAR_EXCESO && (
                  <div className={isHorizontal ? 'grid grid-cols-12 gap-3 items-center py-1' : 'flex flex-col items-center gap-3 py-1'}>
                    <div className={`${isHorizontal ? 'col-span-6' : ''} text-center text-sm text-gray-700 bg-orange-50 border border-orange-200 p-3 rounded-lg`}>
                      Vas a preparar <strong className="text-orange-600 text-base">{cantidadPendiente} uds</strong>, superando las <strong className="text-gray-900">{lineaActual.cantsolicitada} uds</strong> solicitadas.
                    </div>
                    <div className={`${isHorizontal ? 'col-span-6 flex flex-col' : 'flex w-full'} gap-2`}>
                      <button
                        type="button"
                        onClick={() => ejecutarCarga(cantidadPendiente)}
                        disabled={loading}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-lg text-sm shadow"
                      >
                        CONFIRMAR EXCESO
                      </button>
                      <button
                        type="button"
                        onClick={() => setFase(FASE.INTRODUCIR_CANTIDAD)}
                        className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2.5 rounded-lg text-sm"
                      >
                        CORREGIR CANTIDAD
                      </button>
                    </div>
                  </div>
                )}

                {/* ── POPUP FASE 5B: CONFIRMAR SUMA O SUSTITUCIÓN ── */}
                {fase === FASE.CONFIRMAR_SUMA_SUSTITUCION && (
                  <div className={isHorizontal ? 'grid grid-cols-12 gap-3 items-center' : 'flex flex-col gap-2.5'}>
                    <div className={`${isHorizontal ? 'col-span-5' : ''} text-center text-xs sm:text-sm text-gray-700 bg-blue-50 p-2.5 rounded-lg border border-blue-200`}>
                      Ya tienes preparadas <strong>{unidadesYaPreparadas} uds</strong> de este artículo en esta ubicación.
                      <div className="mt-1">
                        ¿Deseas <strong>SUMAR</strong> las <strong>{cantidadPendiente}</strong> nuevas o <strong>SUSTITUIR</strong>?
                      </div>
                    </div>
                    <div className={`${isHorizontal ? 'col-span-7' : ''} flex flex-col gap-2`}>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSumaSustitucion('sumar')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-lg text-xs sm:text-sm shadow"
                      >
                        SUMAR (+{cantidadPendiente} ➔ Total {unidadesYaPreparadas + parseFloat(cantidadPendiente || 0)})
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSumaSustitucion('sustituir')}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-2.5 rounded-lg text-xs sm:text-sm shadow"
                      >
                        SUSTITUIR (Dejar en {cantidadPendiente})
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setFase(FASE.INTRODUCIR_CANTIDAD)}
                        className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg text-xs"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>

      {stepActual >= 1 && !isHorizontal && (
        <WizardBottomBar items={navItems} vertical={false} />
      )}

      {/* Modal de Salida (Exit) */}
      <ConfirmDialog
        isOpen={showExitModal}
        onCancel={() => setShowExitModal(false)}
        onConfirm={() => navigate('/prepara')}
        title="Atención"
        icon={<AlertTriangle />}
        message="¿Seguro que quieres salir?"
        cancelText="CONTINUAR"
        confirmText="SALIR"
      >
        {numLineasPendientes > 0 && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-md">
            <p className="font-bold mb-1 flex items-center justify-center gap-1">
              <List size={16} /> Faltan líneas
            </p>
            <p className="text-sm">
              Aún quedan <strong>{numLineasPendientes}</strong> líneas pendientes de preparar en este pedido.
            </p>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Podrás retomar la preparación de este pedido más adelante.
        </p>
      </ConfirmDialog>

      {/* Modal de Utilidades de Línea (Longpress) */}
      <LineaUtilidadesModal
        isOpen={showUtilidadesModal}
        onClose={() => setShowUtilidadesModal(false)}
        linea={lineaParaUtilidades}
      />

      {/* Modal de confirmación de descarga (anular línea preparada) */}
      {lineaParaDescargar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className={`bg-white rounded-xl w-full ${isHorizontal ? 'max-w-2xl' : 'max-w-md'} shadow-xl flex flex-col gap-3 p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 size={18} className="text-red-500 shrink-0" />
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">Anular preparación</h3>
              </div>
              <span className="text-xs font-mono text-gray-500">Ref: {lineaParaDescargar.codarticuloaplicacion}</span>
            </div>
            <div className="text-xs font-semibold text-gray-700 truncate">{lineaParaDescargar.nombrearticulo}</div>

            {loadingDescarga ? (
              <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-sm">Cargando detalle...</span>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-2.5 flex flex-col gap-2 max-h-44 overflow-y-auto">
                {registrosAAnular.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center">No hay registros de preparación.</p>
                ) : registrosAAnular.map((rec, i) => {
                  const maxPendiente = rec.cantpreparada - (rec.cantdevuelta || 0);
                  if (maxPendiente <= 0) return null;

                  return (
                    <div key={i} className={`flex items-start gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0 ${!rec.selected ? 'opacity-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={rec.selected}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setRegistrosAAnular(prev => prev.map((r, idx) => idx === i ? { ...r, selected: val } : r));
                        }}
                        className="mt-1 shrink-0 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <div className="flex-1 min-w-0 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-gray-700 mr-2">📦 {rec.nombreubicacion || rec.codubicacion}</span>
                          {rec.numerolote && <span className="text-gray-500 mr-2">Lote: {rec.numerolote}</span>}
                          {rec.fechacaducidad && <span className="text-orange-600">Cad: {rec.fechacaducidad}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Disp: <strong>{maxPendiente}</strong></span>
                          <span className="text-gray-700">Anular:</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rec.cantidadAAnular}
                            disabled={!rec.selected}
                            onChange={(e) => {
                              const rawVal = e.target.value.replace(/[^0-9.,]/g, '');
                              setRegistrosAAnular(prev => prev.map((r, idx) => idx === i ? { ...r, cantidadAAnular: rawVal } : r));
                            }}
                            onBlur={(e) => {
                              let parsed = parseFloat(e.target.value.replace(',', '.'));
                              if (isNaN(parsed) || parsed < 0) parsed = 0;
                              if (parsed > maxPendiente) parsed = maxPendiente;
                              setRegistrosAAnular(prev => prev.map((r, idx) => idx === i ? { ...r, cantidadAAnular: parsed } : r));
                            }}
                            className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setLineaParaDescargar(null); setRecorridoDescarga([]); }}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 font-semibold text-gray-600 hover:bg-gray-50 text-xs sm:text-sm"
                disabled={loadingDescarga}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarDescarga}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
                disabled={loadingDescarga || recorridoDescarga.length === 0}
              >
                {loadingDescarga ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Anular preparación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── COMPONENTES AUXILIARES ──────────────────────────────────────────────────

function StepChip({ label, subLabel, icon, active, completed, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all min-w-0 ${
        active
          ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-300'
          : completed
            ? 'bg-green-50 text-green-800 border-green-300 hover:bg-green-100'
            : 'bg-gray-50 text-gray-400 border-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
    >
      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tight">
        {completed && !active ? <CheckCircle size={12} className="text-green-600 shrink-0" /> : icon}
        <span className="truncate">{label}</span>
      </div>
      <span className={`text-[9px] font-semibold truncate w-full mt-0.5 ${
        active ? 'text-blue-100' : completed ? 'text-green-700' : 'text-gray-400'
      }`}>
        {subLabel}
      </span>
    </button>
  );
}

function PanelInfoCard({
  lineaActual,
  ubicacionConfirmada,
  mismaUbicacionMantenida,
  loteSeleccionado,
  factorEanSeleccionado,
  compact,
  isHorizontal,
  onLongPress
}) {
  const longPressProps = useLongPress(() => onLongPress(lineaActual), null, { delay: 500 });
  if (!lineaActual) return null;

  const pte = lineaActual.cantsolicitada - (lineaActual.cantpreparada || 0);
  const pr = lineaActual.cantpreparada || 0;

  let cajasTxt = '';
  const factor = lineaActual.factorconversiontipounidad;
  if (factor && factor > 1) {
    const numCajas = Math.floor(pte / factor);
    cajasTxt = numCajas > 0 ? `${numCajas} CAJ(${factor})` : '';
  }

  return (
    <div
      {...longPressProps}
      className={`bg-white border-2 border-sga-primary/30 rounded-xl ${
        isHorizontal ? 'p-2.5 gap-1.5 flex-1 justify-between' : compact ? 'p-2.5 gap-1.5' : 'p-3.5 gap-2.5'
      } shadow-sm flex flex-col relative overflow-hidden select-none active:bg-blue-50/40 transition-colors cursor-pointer`}
      title="💡 Mantén pulsada esta tarjeta para consultar utilidades de stock y ubicación"
    >
      {/* Borde izquierdo decorativo */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-sga-primary rounded-l-xl"></div>

      {/* ── Ubicación Objetivo Destacada ── */}
      <div className="flex items-center justify-between pl-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <MapPin size={18} className="text-sga-primary shrink-0" />
          <span className="font-black text-sga-primary text-lg sm:text-xl truncate">
            {lineaActual.nombreubicacion || lineaActual.codhueco || lineaActual.descripcion || lineaActual.codubicacion}
          </span>
        </div>
        {ubicacionConfirmada ? (
          <span className="bg-green-100 text-green-800 border border-green-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
            <CheckCircle size={12} className="text-green-600" />
            {mismaUbicacionMantenida ? 'MISMO HUECO' : 'CONFIRMADA'}
          </span>
        ) : (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
            PENDIENTE LEER
          </span>
        )}
      </div>

      {/* ── Artículo ── */}
      <div className="flex items-start gap-2 pl-2">
        <Box size={16} className="text-gray-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-800 text-xs sm:text-sm leading-snug line-clamp-2">
            {lineaActual.nombrearticulo}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-gray-600 font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded">
              Ref: {lineaActual.codarticuloaplicacion || lineaActual.codarticulo}
            </span>
            {factorEanSeleccionado > 1 && (
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                EAN x{factorEanSeleccionado}
              </span>
            )}
            {loteSeleccionado && (
              <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">
                Lote: {loteSeleccionado.numerolote || loteSeleccionado.codnumerolote}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Observaciones ── */}
      {lineaActual.observaciones && (
        <div className="ml-2 bg-orange-50 text-orange-800 text-[11px] px-2 py-1 rounded border border-orange-200 flex gap-1.5 items-start">
          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-orange-500" />
          <span className="font-medium leading-tight line-clamp-1">{lineaActual.observaciones}</span>
        </div>
      )}

      {/* ── Cantidades ── */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-1.5 sm:p-2 border border-gray-200 pl-3 ml-1">
        <div className="flex gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">SOLICITADO</span>
            <span className="text-base sm:text-lg font-black text-gray-500 leading-none mt-0.5">{lineaActual.cantsolicitada}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">PREPARADO</span>
            <span className="text-base sm:text-lg font-black text-gray-500 leading-none mt-0.5">{pr}</span>
          </div>
          <div className="flex flex-col pl-2.5 border-l border-gray-300">
            <span className="text-[9px] text-sga-primary font-bold uppercase tracking-wider">PDTE</span>
            <span className="text-xl sm:text-2xl font-black text-sga-primary leading-none mt-0.5">{pte}</span>
          </div>
        </div>

        <div className="flex flex-col items-end justify-center shrink-0 ml-2">
          {cajasTxt && (
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200 shadow-sm">
              {cajasTxt}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function LineaPendienteRow({ lin, outOfStock, onSelect, onLongPress }) {
  const longPressOccurred = useRef(false);

  const handleLongPress = useCallback(() => {
    longPressOccurred.current = true;
    onLongPress(lin);
  }, [lin, onLongPress]);

  const longPressProps = useLongPress(handleLongPress, null, { delay: 500, shouldPreventDefault: false });

  const handleClick = useCallback(() => {
    if (longPressOccurred.current) {
      longPressOccurred.current = false;
      return;
    }
    if (outOfStock) {
      return;
    }
    onSelect(lin);
  }, [lin, outOfStock, onSelect]);

  const stock = lin.stocktotal || 0;
  return (
    <div
      {...longPressProps}
      onClick={handleClick}
      className={`border rounded p-2 text-xs sm:text-sm shadow-sm transition-colors select-none ${
        outOfStock ? 'bg-red-50 border-red-200' : 'active:bg-blue-50/60 hover:border-blue-300 cursor-pointer'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="font-bold truncate text-gray-800 flex-1">{lin.nombrearticulo}</div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLongPress(lin);
          }}
          className="text-gray-400 hover:text-sga-primary p-0.5 rounded transition-colors shrink-0"
          title="Ver utilidades"
        >
          <Info size={15} />
        </button>
      </div>
      <div className="flex justify-between items-center text-gray-500 text-[11px] mt-1 font-mono">
        <span className="truncate mr-1">Ref: <strong className="text-gray-700">{lin.codarticuloaplicacion}</strong></span>
        <div className="flex gap-1.5 text-[10px]">
          <span className={`font-bold ${outOfStock ? 'text-red-500' : 'text-blue-600'}`}>Stk:{stock}</span>
          <span className="font-bold text-gray-600">Sol:{lin.cantsolicitada}</span>
          <span className="font-bold text-gray-600">Prp:{lin.cantpreparada || 0}</span>
          <span className="font-bold text-sga-success">Pte:{lin.cantsolicitada - (lin.cantpreparada || 0)}</span>
        </div>
      </div>
    </div>
  );
}

export default PreparaPedido;
