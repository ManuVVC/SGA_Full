import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText, CheckCircle, AlertTriangle, Search, PlusCircle, Save, MapPin, XCircle } from 'lucide-react';
import TerminalHeader from '../components/TerminalHeader';
import ArticleSearchInput from '../components/ArticleSearchInput';
import { useKeyboard } from '../contexts/KeyboardContext';
import { getClientes, getParametros, crearCabecera, grabarLineaDevolucion, getDevolucionEnCurso, getLineasDevolucion } from '../api/devolucionesService';
import { validarUbicacion } from '../api/reubicacionesService';
import { usePermissions } from '../hooks/usePermissions';

const parseShorthandDate = (input) => {
  if (!input) return '';
  if (input.includes('-') || input.includes('/')) return input;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

  const clean = input.replace(/\D/g, '');

  if (clean.length === 1 || clean.length === 2) {
    const dd = clean.padStart(2, '0');
    return `${currentYear}-${currentMonth}-${dd}`;
  } else if (clean.length === 4) {
    const dd = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    return `${currentYear}-${mm}-${dd}`;
  } else if (clean.length === 6) {
    const dd = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    const aa = clean.substring(4, 6);
    return `20${aa}-${mm}-${dd}`;
  }

  return input;
};

export default function DevolucionCliente() {
  const navigate = useNavigate();
  const { isKeyboardOpen } = useKeyboard();
  const { hasOperatorPermission, loading: permsLoading } = usePermissions();

  // Control de acceso por permisos de operador
  useEffect(() => {
    if (!permsLoading && !hasOperatorPermission('PRM_DEVOLUCIONESCLIENTE')) {
      navigate('/menu');
    }
  }, [permsLoading, hasOperatorPermission, navigate]);

  // Pasos: 1 = Buscar Cliente, 2 = Crear Cabecera, 3 = Registrar Líneas
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Parámetros de configuración
  const [parametros, setParametros] = useState({
    pedir_ubicacion: false,
    cod_ubicacion_defecto: null,
    serie: null,
  });

  // Datos de cabecera
  const [filtroCliente, setFiltroCliente] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [fechaDocumento, setFechaDocumento] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');

  // Cabecera creada
  const [documentoCreado, setDocumentoCreado] = useState(null); // { cod_documento, num_documento, serie }

  // Datos de línea activa
  const [articuloInfo, setArticuloInfo] = useState(null);
  const [unidades, setUnidades] = useState('');
  const [lote, setLote] = useState('');
  const [caducidad, setCaducidad] = useState('');

  // Ubicación destino (si es dinámica)
  const [ubicacionDestino, setUbicacionDestino] = useState('');
  const [ubicacionDestinoId, setUbicacionDestinoId] = useState(null);
  const [ubicacionConfirmada, setUbicacionConfirmada] = useState(false);
  const [ubicacionNombre, setUbicacionNombre] = useState('');

  // Historial de líneas grabadas en la sesión actual
  const [lineasGrabadas, setLineasGrabadas] = useState([]);
  const [showLineasGrabadas, setShowLineasGrabadas] = useState(false);

  // Estados de posiciones para ubicación
  const [posicionesDisponibles, setPosicionesDisponibles] = useState([]);
  const [showPosicionModal, setShowPosicionModal] = useState(false);

  // Refs de foco
  const inputClienteRef = useRef(null);
  const obsRef = useRef(null);
  const ubicacionRef = useRef(null);
  const unidadesRef = useRef(null);
  const loteRef = useRef(null);
  const caducidadRef = useRef(null);

  // Inicializar parámetros y comprobar si hay devolución en curso
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // 1. Obtener parámetros
        const paramsRes = await getParametros();
        if (paramsRes.status === 'success') {
          setParametros(paramsRes.parametros);
        }

        // 2. Comprobar si hay una devolución en curso para este operario
        const enCursoRes = await getDevolucionEnCurso();
        if (enCursoRes.status === 'success' && enCursoRes.devolucion) {
          const dev = enCursoRes.devolucion;
          setSelectedCliente(dev.cliente);
          setDocumentoCreado({
            cod_documento: dev.cod_documento,
            num_documento: dev.num_documento,
            serie: dev.serie
          });
          setObservaciones(dev.observaciones || '');

          // Cargar las líneas ya grabadas de esta devolución
          const lineasRes = await getLineasDevolucion(dev.cod_documento);
          if (lineasRes.status === 'success') {
            setLineasGrabadas(lineasRes.lineas || []);
          }

          setStep(3);
        }
      } catch (err) {
        setError('Error al inicializar el módulo de devoluciones.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Foco inicial y por paso
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 1 && inputClienteRef.current) inputClienteRef.current.focus();
      if (step === 2 && obsRef.current) obsRef.current.focus();
      if (step === 3) {
        if (parametros.pedir_ubicacion && !ubicacionConfirmada) {
          ubicacionRef.current?.focus();
        } else if (articuloInfo) {
          if (!unidades) unidadesRef.current?.focus();
          else if (articuloInfo.PRM_TRAZABILIDAD !== 0 && !lote) loteRef.current?.focus();
          else if (articuloInfo.GESTIONARCADUCIDAD !== 0 && !caducidad) caducidadRef.current?.focus();
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [step, parametros.pedir_ubicacion, ubicacionConfirmada, articuloInfo, isKeyboardOpen]);

  // Buscar Clientes
  const handleBuscarClientes = async (e) => {
    if (e) e.preventDefault();
    if (!filtroCliente.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await getClientes(filtroCliente.trim());
      if (res.status === 'success') {
        setClientesEncontrados(res.clientes || []);
        if (res.clientes.length === 0) {
          setError('No se encontraron clientes con ese criterio.');
        }
      }
    } catch (err) {
      setError('Error al buscar clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCliente = (cliente) => {
    setSelectedCliente(cliente);
    setStep(2);
    setError(null);
  };

  // Crear cabecera de documento
  const handleCrearCabecera = () => {
    setStep(3);
    setSuccess(null);
  };

  // Validar Ubicación escaneada por operario
  const handleValidarUbicacion = async (e) => {
    if (e) e.preventDefault();
    if (!ubicacionDestino.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await validarUbicacion(ubicacionDestino.trim());
      if (res.status === 'success') {
        setUbicacionDestinoId(res.ubicacion.CODUBICACION);
        setUbicacionNombre(res.ubicacion.UBICACION);
        setUbicacionConfirmada(true);
      } else if (res.status === 'necesita_posicion') {
        setPosicionesDisponibles(res.opciones);
        setShowPosicionModal(true);
      } else {
        setError(res.message || 'Ubicación no encontrada o no válida.');
        setUbicacionDestino('');
        setTimeout(() => ubicacionRef.current?.focus(), 100);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al validar ubicación.');
      setUbicacionDestino('');
      setTimeout(() => ubicacionRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPosicion = async (posicion) => {
    setShowPosicionModal(false);
    setLoading(true);
    setError(null);
    try {
      const res = await validarUbicacion(ubicacionDestino.trim(), posicion);
      if (res.status === 'success') {
        setUbicacionDestinoId(res.ubicacion.CODUBICACION);
        setUbicacionNombre(res.ubicacion.UBICACION);
        setUbicacionConfirmada(true);
      } else {
        setError(res.message || 'Error al seleccionar la posición.');
        setUbicacionDestino('');
        setTimeout(() => ubicacionRef.current?.focus(), 100);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al validar ubicación.');
      setUbicacionDestino('');
      setTimeout(() => ubicacionRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  // Grabar línea de devolución
  const handleGrabarLinea = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!articuloInfo) return;
    if (!unidades || parseInt(unidades) <= 0) {
      setError('Introduzca cantidad válida.');
      return;
    }
    if (articuloInfo.PRM_TRAZABILIDAD !== 0 && !lote.trim()) {
      setError('El lote es obligatorio para este artículo');
      return;
    }
    if (articuloInfo.GESTIONARCADUCIDAD !== 0 && !caducidad.trim()) {
      setError('La fecha de caducidad es obligatoria para este artículo');
      return;
    }

    const parsedCaducidad = caducidad ? parseShorthandDate(caducidad) : null;

    if (parsedCaducidad) {
      const caducidadDate = new Date(parsedCaducidad);
      const today = new Date();
      caducidadDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (caducidadDate < today) {
        const accept = window.confirm('El artículo está caducado (fecha inferior a hoy). ¿Desea aceptar la devolución de todas formas?');
        if (!accept) return;
      } else if (articuloInfo.MARGENCADUCIDAD > 0) {
        const minDate = new Date(today);
        minDate.setDate(minDate.getDate() + articuloInfo.MARGENCADUCIDAD);

        if (caducidadDate < minDate) {
          const accept = window.confirm(`El artículo no cumple el margen de caducidad requerido (${articuloInfo.MARGENCADUCIDAD} días). ¿Desea aceptar la devolución de todas formas?`);
          if (!accept) return;
        }
      }
    }

    const totalUnits = parseInt(unidades, 10) * (articuloInfo.UNIDADES || 1);

    setLoading(true);
    try {
      // Determinar ubicación final
      const codUbicacion = parametros.pedir_ubicacion ? ubicacionDestinoId : parametros.cod_ubicacion_defecto;

      // Mapeo de TIPOCODIGOINTRODUCIDO y CODIGOINTRODUCIDO
      let tipoCodigoIntroducido = null;
      let codigoIntroducido = null;
      if (articuloInfo.searchType === 'codarticuloaplicacion') {
        tipoCodigoIntroducido = 0;
        codigoIntroducido = articuloInfo.searchQuery;
      } else if (articuloInfo.searchType === 'codfacturacion') {
        tipoCodigoIntroducido = 1;
        codigoIntroducido = articuloInfo.searchQuery;
      }

      let docId = documentoCreado?.cod_documento;

      if (!docId) {
        const payloadCabecera = {
          CODCLIENTE: selectedCliente.CODCLIENTE,
          CIF: selectedCliente.CIF,
          RAZONSOCIAL: selectedCliente.RAZONSOCIAL,
          NOMBRECOMERCIAL: selectedCliente.NOMBRECOMERCIAL,
          DIRECCION: selectedCliente.DIRECCION,
          POBLACION: selectedCliente.POBLACION,
          FECHADOCUMENTO: fechaDocumento,
          OBSERVACIONES: observaciones,
          CODUBICACION: codUbicacion,
        };

        const resCabecera = await crearCabecera(payloadCabecera);
        if (resCabecera.status === 'success' && resCabecera.data) {
          docId = resCabecera.data.cod_documento;
          setDocumentoCreado(resCabecera.data);
        } else {
          throw new Error(resCabecera.message || 'Error al crear la cabecera del documento.');
        }
      }

      const payload = {
        CODDOCUMENTO: docId,
        CODARTICULO: articuloInfo.CODARTICULO,
        UNIDADES: totalUnits,
        NUMEROLOTE: lote.trim().toUpperCase(),
        FECHACADUCIDAD: parsedCaducidad,
        EAN: articuloInfo.CODARTICULOAPLICACION,
        CODUBICACION: codUbicacion,
        TIPOCODIGOINTRODUCIDO: tipoCodigoIntroducido,
        CODIGOINTRODUCIDO: codigoIntroducido
      };

      const res = await grabarLineaDevolucion(payload);
      if (res.status === 'success') {
        setSuccess(`Grabado: ${articuloInfo.CODARTICULOAPLICACION} x ${totalUnits}`);

        // Agregar a lista local para control visual del operario
        setLineasGrabadas(prev => [
          {
            cod_articulo_aplicacion: articuloInfo.CODARTICULOAPLICACION,
            nombre: articuloInfo.NOMBREARTICULO,
            unidades: totalUnits,
            lote: lote.trim().toUpperCase(),
            caducidad: parsedCaducidad || '',
            ubicacion: res.data.cod_ubicacion
          },
          ...prev
        ]);

        // Limpiar formulario de línea
        setArticuloInfo(null);
        setUnidades('');
        setLote('');
        setCaducidad('');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Error al grabar línea.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 3 && documentoCreado) {
      if (window.confirm('¿Seguro que desea salir? La devolución en curso quedará guardada y pendiente.')) {
        navigate('/devoluciones');
      }
    } else {
      navigate('/devoluciones');
    }
  };

  const handleVerLineasGrabadas = async () => {
    if (!documentoCreado) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getLineasDevolucion(documentoCreado.cod_documento);
      if (res.status === 'success') {
        setLineasGrabadas(res.lineas || []);
        setShowLineasGrabadas(true);
      }
    } catch (err) {
      setError('Error al recuperar las líneas grabadas de la devolución.');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setFiltroCliente('');
    setClientesEncontrados([]);
    setSelectedCliente(null);
    setDocumentoCreado(null);
    setArticuloInfo(null);
    setUnidades('');
    setLote('');
    setCaducidad('');
    setUbicacionDestino('');
    setUbicacionDestinoId(null);
    setUbicacionConfirmada(false);
    setUbicacionNombre('');
    setLineasGrabadas([]);
    setShowLineasGrabadas(false);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-gray-100">
      <TerminalHeader title="DEV. CLIENTE" />

      <div className="flex-1 p-4 overflow-y-auto pb-32">
        {/* Barra navegación y retroceso */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={handleBack} className="p-2 bg-white border border-gray-300 shadow rounded text-sga-dark">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-sga-dark">Volver</span>
          </div>
        </div>

        {/* Mensajes informativos */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow flex items-center gap-2 font-bold animate-pulse">
            <AlertTriangle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded shadow flex items-center gap-2 font-bold">
            <CheckCircle className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* PASO 1: BÚSQUEDA DE CLIENTE */}
        {step === 1 && (
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2 flex items-center gap-2">
              <User className="text-sga-primary" />
              1. Seleccionar Cliente
            </h2>

            <form onSubmit={handleBuscarClientes} className="flex gap-2 mb-4">
              <input
                ref={inputClienteRef}
                type="text"
                className="flex-1 p-3 border-2 border-gray-300 rounded text-lg uppercase"
                placeholder="Código, Nombre o CIF..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                disabled={loading}
              />
              <button type="submit" disabled={loading || !filtroCliente.trim()} className="bg-sga-primary text-white p-3 rounded font-bold shadow hover:bg-blue-900 flex items-center justify-center">
                <Search className="w-6 h-6" />
              </button>
            </form>

            {clientesEncontrados.length > 0 && (
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto mt-2 border-t pt-3">
                {clientesEncontrados.map((cli) => (
                  <button
                    key={cli.CODCLIENTE}
                    onClick={() => handleSelectCliente(cli)}
                    className="p-3 bg-gray-50 hover:bg-sga-blue hover:text-white border border-gray-200 rounded text-left transition-colors flex flex-col gap-0.5"
                  >
                    <span className="font-bold text-lg">{cli.CODCLIENTEAPLICACION}</span>
                    <span className="text-sm font-semibold">{cli.RAZONSOCIAL}</span>
                    {cli.NOMBRECOMERCIAL && cli.NOMBRECOMERCIAL !== cli.RAZONSOCIAL && (
                      <span className="text-xs italic opacity-85">{cli.NOMBRECOMERCIAL}</span>
                    )}
                    <span className="text-xs text-gray-500">CIF: {cli.CIF} · {cli.POBLACION}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASO 2: FORMULARIO CABECERA */}
        {step === 2 && selectedCliente && (
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-bold text-brand-dark mb-4 border-b pb-2 flex items-center gap-2">
              <FileText className="text-sga-primary" />
              2. Cabecera de Devolución
            </h2>

            <div className="bg-blue-50 p-3 rounded mb-4 border border-blue-200">
              <p className="text-sm text-gray-600 font-bold">Cliente Seleccionado:</p>
              <p className="text-lg font-bold text-sga-primary">{selectedCliente.RAZONSOCIAL}</p>
              <p className="text-xs text-gray-500">Cód: {selectedCliente.CODCLIENTEAPLICACION} · CIF: {selectedCliente.CIF}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Devolución</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none"
                  value={fechaDocumento}
                  onChange={(e) => setFechaDocumento(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones / Motivo</label>
                <textarea
                  ref={obsRef}
                  className="w-full border border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none"
                  rows="3"
                  placeholder="Escriba aquí los motivos de la devolución..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleCrearCabecera}
                disabled={loading}
                className="w-full bg-sga-primary hover:bg-blue-900 text-white font-bold p-4 rounded text-xl shadow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-6 h-6" />
                {loading ? 'CREANDO...' : 'CREAR CABECERA'}
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: GRABADO DE LÍNEAS */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Info Cabecera */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center pb-2 border-b mb-2">
                <span className="font-bold text-gray-700">
                  {documentoCreado ? `Doc Dev: ${documentoCreado.num_documento}` : 'Nueva Devolución'}
                </span>
                <span className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-bold">
                  Serie: {documentoCreado ? (documentoCreado.serie || 'N/A') : (parametros.serie || 'N/A')}
                </span>
              </div>
              <p className="text-sm text-gray-600 font-semibold">{selectedCliente.RAZONSOCIAL}</p>
            </div>

            {/* Configuración de Ubicación (si requiere escanear) */}
            {parametros.pedir_ubicacion && (
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Ubicación de Devolución
                </label>
                {ubicacionConfirmada ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded">
                    <div className="flex items-center gap-2 text-green-700 font-bold">
                      <MapPin className="w-5 h-5" />
                      <span>
                        {ubicacionNombre && ubicacionNombre.toUpperCase() !== ubicacionDestino.toUpperCase()
                          ? `${ubicacionNombre.toUpperCase()} (${ubicacionDestino.toUpperCase()})`
                          : (ubicacionNombre ? ubicacionNombre.toUpperCase() : ubicacionDestino.toUpperCase())
                        }
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setUbicacionConfirmada(false);
                        setUbicacionDestinoId(null);
                        setUbicacionDestino('');
                        setUbicacionNombre('');
                      }}
                      className="text-xs text-red-600 font-bold hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleValidarUbicacion} className="flex gap-2">
                    <input
                      ref={ubicacionRef}
                      type="text"
                      className="flex-1 p-3 border border-gray-300 rounded text-lg uppercase"
                      placeholder="Escanear ubicación destino..."
                      value={ubicacionDestino}
                      onChange={(e) => setUbicacionDestino(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={loading || !ubicacionDestino.trim()}
                      className="bg-sga-primary text-white px-4 py-3 rounded font-bold shadow disabled:opacity-50"
                    >
                      OK
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Buscador de Artículos (Desbloqueado si ubicación confirmada o si no requiere pedirla) */}
            {(!parametros.pedir_ubicacion || ubicacionConfirmada) && (
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                {!articuloInfo ? (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Escanear Artículo de Devolución</label>
                    <ArticleSearchInput
                      onArticleSelected={(article) => {
                        setArticuloInfo(article);
                        setError(null);
                      }}
                      autoFocus
                      disabled={loading}
                    />
                  </div>
                ) : (
                  <div className={articuloInfo.FECHADESCATALOGACION ? "bg-orange-50 p-3 rounded border border-orange-500 shadow-sm mb-4" : "bg-blue-50 p-3 rounded border border-sga-blue shadow-sm mb-4"}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={articuloInfo.FECHADESCATALOGACION ? "font-bold text-orange-600 text-lg" : "font-bold text-sga-blue text-lg"}>
                        {articuloInfo.CODARTICULOAPLICACION}
                      </span>
                      <button
                        onClick={() => {
                          setArticuloInfo(null);
                          setUnidades('');
                          setLote('');
                          setCaducidad('');
                        }}
                        className="text-xs text-red-600 font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                    <div className="text-sm font-semibold text-gray-700">{articuloInfo.NOMBREARTICULO || articuloInfo.DESCRIPCION}</div>
                    {articuloInfo.FECHADESCATALOGACION && (
                      <span className="inline-block bg-orange-200 text-orange-800 text-[10px] px-2 py-0.5 rounded font-black mt-1 uppercase animate-pulse">
                        Descatalogado ({new Date(articuloInfo.FECHADESCATALOGACION).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                )}

                {/* Formulario de grabado de línea */}
                {articuloInfo && (
                  <form onSubmit={handleGrabarLinea} className="space-y-4 pt-2 border-t mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Cantidad</label>
                        <input
                          ref={unidadesRef}
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="w-full border border-gray-300 p-3 rounded text-lg focus:border-sga-primary"
                          placeholder="Ej: 10"
                          value={unidades}
                          onChange={(e) => setUnidades(e.target.value)}
                          disabled={loading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault(); // Evitar submit automático del formulario
                              if (articuloInfo.PRM_TRAZABILIDAD !== 0) {
                                loteRef.current?.focus();
                              } else if (articuloInfo.GESTIONARCADUCIDAD !== 0) {
                                caducidadRef.current?.focus();
                              } else {
                                handleGrabarLinea();
                              }
                            }
                          }}
                        />
                        {articuloInfo.UNIDADES > 1 && (
                          <div className="flex justify-between items-center bg-blue-50 px-3 py-1.5 rounded border border-blue-200 mt-2">
                            <span className="text-gray-600 font-bold text-base">x {articuloInfo.UNIDADES}</span>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-500 block leading-tight">Total Unidades:</span>
                              <span className="text-blue-700 font-bold text-base">
                                {unidades && !isNaN(parseInt(unidades, 10)) ? parseInt(unidades, 10) * articuloInfo.UNIDADES : 0}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lote */}
                      {articuloInfo.PRM_TRAZABILIDAD !== 0 && (
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Lote</label>
                          <input
                            ref={loteRef}
                            type="text"
                            inputMode={isKeyboardOpen ? "text" : "none"}
                            className="w-full border border-gray-300 p-3 rounded text-lg focus:border-sga-primary uppercase"
                            placeholder="Nº Lote"
                            value={lote}
                            onChange={(e) => setLote(e.target.value)}
                            disabled={loading}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault(); // Evitar submit automático del formulario
                                if (articuloInfo.GESTIONARCADUCIDAD !== 0) {
                                  caducidadRef.current?.focus();
                                } else {
                                  handleGrabarLinea();
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Fecha de caducidad */}
                    {articuloInfo.GESTIONARCADUCIDAD !== 0 && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Fecha Caducidad</label>
                        <input
                          ref={caducidadRef}
                          type="text"
                          inputMode="numeric"
                          placeholder="DD, DDMM o DDMMAA"
                          className="w-full border border-gray-300 p-3 rounded text-lg focus:border-sga-primary"
                          value={caducidad}
                          onChange={(e) => setCaducidad(e.target.value)}
                          onBlur={() => setCaducidad(parseShorthandDate(caducidad))}
                          disabled={loading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault(); // Evitar submit automático del formulario
                              setCaducidad(parseShorthandDate(caducidad)); // Parse immediately if Enter pressed
                              setTimeout(() => handleGrabarLinea(), 50);
                            }
                          }}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !unidades}
                      className="w-full bg-sga-primary hover:bg-blue-900 text-white font-bold p-4 rounded text-xl shadow flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <PlusCircle className="w-6 h-6" />
                      {loading ? 'GRABANDO...' : 'GRABAR LÍNEA'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {documentoCreado && (
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleVerLineasGrabadas}
                  className="w-full p-3 bg-blue-100 text-blue-800 font-bold rounded border border-blue-300 hover:bg-blue-200"
                >
                  Ver Lín. Grabadas
                </button>
              </div>
            )}

            {/* MODAL LÍNEAS GRABADAS */}
            {showLineasGrabadas && (
              <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex flex-col p-4">
                <div className="bg-white flex-1 rounded-lg shadow-xl flex flex-col overflow-hidden">
                  <div className="p-4 bg-blue-800 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg">Líneas Grabadas</h3>
                    <button
                      type="button"
                      onClick={() => setShowLineasGrabadas(false)}
                      className="p-1 hover:bg-blue-700 rounded text-white"
                    >
                      <XCircle size={24} />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto">
                    {lineasGrabadas.length === 0 ? (
                      <p className="text-gray-500 text-center italic py-10">No hay líneas grabadas en esta devolución.</p>
                    ) : (
                      <div className="space-y-2">
                        {lineasGrabadas.map((line, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 border rounded text-sm flex justify-between items-start gap-2 shadow-sm">
                            <div className="flex-1">
                              <p className="font-bold text-sga-dark">{line.cod_articulo_aplicacion}</p>
                              <p className="text-xs text-gray-600 leading-tight mb-1 truncate">{line.nombre}</p>
                              <p className="text-[11px] text-gray-500">
                                {line.lote && <span className="mr-2">Lote: <strong className="text-gray-700">{line.lote}</strong></span>}
                                {line.caducidad && <span>Cad: <strong className="text-gray-700">{line.caducidad}</strong></span>}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-lg font-black text-sga-primary">{line.unidades} uds</span>

                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Modal Múltiples Posiciones */}
            {showPosicionModal && (
              <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="bg-sga-primary text-white p-4 font-bold text-lg flex items-center gap-2">
                    <MapPin />
                    Selecciona Posición
                  </div>
                  <div className="p-4 overflow-y-auto flex flex-col gap-2">
                    <p className="text-sm text-gray-600 mb-2 text-center">
                      Múltiples posiciones para esta etiqueta.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {posicionesDisponibles.map((posObj, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectPosicion(posObj.POSICION)}
                          className="w-full py-4 px-4 bg-gray-50 border-2 border-gray-300 rounded text-center font-bold text-xl text-sga-dark hover:bg-sga-primary hover:text-white hover:border-sga-primary transition-colors"
                        >
                          Pos {posObj.POSICION}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border-t bg-gray-50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPosicionModal(false);
                        setUbicacionDestino('');
                        setTimeout(() => ubicacionRef.current?.focus(), 100);
                      }}
                      className="w-full py-3 bg-gray-400 text-white rounded font-bold shadow"
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
