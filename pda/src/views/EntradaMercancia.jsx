import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, Truck, Search, PlusCircle, Save, XCircle, FileText } from 'lucide-react';
import { getParametros, getMuelles, getAlbaranesEnCurso, getProveedoresPendientes, getTodosProveedores, getPedidosPendientes, crearAlbaran, grabarLineaEntrada, finalizarEntrada, getLineasGrabadas, getDetalleLinea, getLineasPendientes, getArticuloInfoEan } from '../api/entradasService';
import TerminalHeader from '../components/TerminalHeader';
import { useKeyboard } from '../contexts/KeyboardContext';
import ArticleSearchInput from '../components/ArticleSearchInput';

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

export default function EntradaMercancia() {
  const navigate = useNavigate();
  const { isKeyboardOpen } = useKeyboard();

  const permisosUsuario = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('sga_permissions') || '{}');
    } catch {
      return {};
    }
  }, []);
  
  // En base de datos puede ser -1, 1 o booleanos. Validamos que no sea 0 ni falso.
  const prmEntrada = permisosUsuario.PRM_ENTRADAMERCANCIASINDOC;
  const canCreateSinPedido = prmEntrada !== 0 && prmEntrada !== false && prmEntrada !== undefined && prmEntrada !== null;

  // Steps: 1 = Muelle, 2 = Albaranes en Curso, 3 = Proveedor/Pedido, 4 = Albaran Nuevo, 5 = Lineas
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [articuloInfo, setArticuloInfo] = useState(null);

  // Datos globales
  const [parametros, setParametros] = useState({});
  const [muelles, setMuelles] = useState([]);
  const [albaranesCurso, setAlbaranesCurso] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [todosProveedores, setTodosProveedores] = useState([]);
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [pedidos, setPedidos] = useState([]);

  // Selecciones
  const [selectedMuelle, setSelectedMuelle] = useState(null);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null); // null if 'sin pedido'
  
  // Albaran
  const [numAlbaran, setNumAlbaran] = useState('');
  const [codDocumento, setCodDocumento] = useState(null); // Documento de entrada creado
  const [numPedidoAsociado, setNumPedidoAsociado] = useState(null);
  const [fechaAlbaran, setFechaAlbaran] = useState('');
  const [fechaRecepcion, setFechaRecepcion] = useState('');
  const [numExpedicion, setNumExpedicion] = useState('');

  // Linea (paso 4)
  const [ean, setEan] = useState('');
  const [unidades, setUnidades] = useState('');
  const [lote, setLote] = useState('');
  const [caducidad, setCaducidad] = useState('');
  const [isPalet, setIsPalet] = useState(false);
  const [numBultos, setNumBultos] = useState('');

  // Modales y datos de líneas
  const [showLineasGrabadas, setShowLineasGrabadas] = useState(false);
  const [lineasGrabadas, setLineasGrabadas] = useState([]);
  const [showDetalleLinea, setShowDetalleLinea] = useState(false);
  const [detalleLinea, setDetalleLinea] = useState([]);
  const [showLineasPendientes, setShowLineasPendientes] = useState(false);
  const [lineasPendientes, setLineasPendientes] = useState([]);

  const albaranRef = useRef(null);
  const eanRef = useRef(null);
  const unidadesRef = useRef(null);
  const loteRef = useRef(null);
  const caducidadRef = useRef(null);

  useEffect(() => {
    cargarParametrosYMuelles();
  }, []);

  // Forzar foco en la entrada de datos al alternar el teclado virtual
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 4 && albaranRef.current) {
        albaranRef.current.focus();
      } else if (step === 5 && articuloInfo) {
        if (!unidades) {
          unidadesRef.current?.focus();
        } else if (articuloInfo.PRM_TRAZABILIDAD !== 0 && !lote) {
          loteRef.current?.focus();
        } else if (articuloInfo.GESTIONARCADUCIDAD !== 0 && !caducidad) {
          caducidadRef.current?.focus();
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isKeyboardOpen]);

  const cargarParametrosYMuelles = async () => {
    setLoading(true);
    try {
      const pRes = await getParametros();
      const params = pRes.parametros || {};
      setParametros(params);

      const mRes = await getMuelles();
      setMuelles(mRes.muelles || []);

      if (params['1745'] === '0') {
        cargarAlbaranesEnCurso(0);
      }
    } catch (err) {
      setError('Error inicializando datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarAlbaranesEnCurso = async (muelleId) => {
    setLoading(true);
    try {
      const res = await getAlbaranesEnCurso(muelleId);
      if (res.albaranes?.length > 0) {
        setAlbaranesCurso(res.albaranes);
        setStep(2);
      } else {
        // Directo a nueva entrada
        cargarProveedores();
        setStep(3);
      }
    } catch (err) {
      setError('Error al cargar albaranes en curso');
    } finally {
      setLoading(false);
    }
  };

  const cargarProveedores = async () => {
    setLoading(true);
    try {
      const res = await getProveedoresPendientes();
      setProveedores(res.proveedores || []);
    } catch (err) {
      setError('Error al cargar proveedores pendientes');
    } finally {
      setLoading(false);
    }
  };

  const cargarPedidos = async (provId) => {
    setLoading(true);
    try {
      const res = await getPedidosPendientes(provId);
      setPedidos(res.pedidos || []);
    } catch (err) {
      setError('Error al cargar pedidos del proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleMuelleSelect = (m) => {
    setSelectedMuelle(m);
    cargarAlbaranesEnCurso(m.CODMUELLE);
  };

  const handleNuevaEntrada = () => {
    cargarProveedores();
    setStep(3);
  };

  const handleAlbaranCursoSelect = (alb) => {
    setCodDocumento(alb.CODDOCUMENTO);
    setNumAlbaran(alb.NUMDOCUMENTO);
    setNumPedidoAsociado(alb.NUMPEDIDO || null);
    setSelectedProveedor({ RAZONSOCIAL: alb.RAZONSOCIAL });
    setStep(5);
    setTimeout(() => eanRef.current?.focus(), 100);
  };

  const handleProveedorSelect = (p) => {
    setSelectedProveedor({ CODPROVEEDOR: p.CODPROVEEDOR, RAZONSOCIAL: p.RAZONSOCIAL });
    setSelectedPedido(p.CODDOCUMENTO);
    setNumPedidoAsociado(p.NUMDOCUMENTO);
    setStep(4);
    setTimeout(() => albaranRef.current?.focus(), 100);
  };

  const handleSinPedido = async () => {
    setLoading(true);
    try {
      const res = await getTodosProveedores();
      if (res.status === 'success') {
        setTodosProveedores(res.proveedores || []);
        setFiltroProveedor('');
        setStep(3.5);
      }
    } catch (e) {
      setError('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleProveedorSinPedidoSelect = (p) => {
    setSelectedProveedor({ CODPROVEEDOR: p.CODPROVEEDOR, RAZONSOCIAL: p.RAZONSOCIAL });
    setSelectedPedido(null);
    setNumPedidoAsociado(null);
    setStep(4);
    setTimeout(() => albaranRef.current?.focus(), 100);
  };



  const handleCrearAlbaran = async () => {
    setError(null);
    if (!numAlbaran.trim()) {
      setError("Introduzca número de albarán");
      return;
    }
    if (parametros['1745'] === '0' && !selectedMuelle) {
      setError("Seleccione un muelle para el albarán");
      return;
    }
    // Diferimos la creación del albarán hasta la lectura de la primera línea.
    setStep(5);
    setTimeout(() => eanRef.current?.focus(), 100);
  };

  const handleEanValidation = async (eanLeido) => {
    if (!eanLeido.trim()) {
      setArticuloInfo(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getArticuloInfoEan(eanLeido);
      if (res.status === 'success' && res.info) {
        setArticuloInfo(res.info);
        unidadesRef.current?.focus();
      } else {
        setError(res.message || "Artículo no encontrado");
        setArticuloInfo(null);
      }
    } catch (err) {
      setError("Error al buscar el EAN");
      setArticuloInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGrabarLinea = async () => {
    if (!articuloInfo || !unidades) {
      setError('El artículo y las unidades son obligatorios');
      return;
    }
    if (articuloInfo?.PRM_TRAZABILIDAD !== 0 && !lote) {
      setError('El lote es obligatorio para este artículo');
      return;
    }
    if (articuloInfo?.GESTIONARCADUCIDAD !== 0 && !caducidad) {
      setError('La fecha de caducidad es obligatoria para este artículo');
      return;
    }

    const parsedCaducidad = caducidad ? parseShorthandDate(caducidad) : null;

    if (parsedCaducidad) {
      const caducidadDate = new Date(parsedCaducidad);
      const today = new Date();
      caducidadDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);

      if (caducidadDate < today) {
        setError('El artículo está caducado (fecha inferior a hoy).');
        return;
      }

      if (articuloInfo?.MARGENCADUCIDAD > 0) {
        const minDate = new Date(today);
        minDate.setDate(minDate.getDate() + articuloInfo.MARGENCADUCIDAD);
        
        if (caducidadDate < minDate) {
          setError(`Próximo a caducidad. El artículo requiere un margen de ${articuloInfo.MARGENCADUCIDAD} días.`);
          return;
        }
      }
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        EAN: ean,
        CODARTICULO: articuloInfo?.CODARTICULO,
        COD_ARTICULO_APLICACION: articuloInfo?.CODARTICULOAPLICACION,
        NOMBREARTICULO: articuloInfo?.NOMBREARTICULO,
        UNIDADES: parseInt(unidades, 10) * (articuloInfo?.UNIDADES || 1),
        NUMEROLOTE: lote || null,
        FECHACADUCIDAD: parsedCaducidad,
        ISPALET: isPalet,
        NUMBULTOS: numBultos || 1
      };

      if (codDocumento) {
        payload.CODDOCUMENTO = codDocumento;
      } else {
        // Enviar cabecera junto a la primera línea
        payload.NUMALBARAN = numAlbaran;
        payload.CODPROVEEDOR = selectedProveedor?.CODPROVEEDOR;
        payload.CODMUELLE = selectedMuelle?.CODMUELLE;
        payload.CODPEDIDO = selectedPedido;
        payload.FECHADOCUMENTO = fechaAlbaran ? parseShorthandDate(fechaAlbaran) : null;
        payload.FECHARECEPCION = fechaRecepcion ? parseShorthandDate(fechaRecepcion) : null;
        payload.NUMEXPEDICION = numExpedicion || null;
      }

      const res = await grabarLineaEntrada(payload);
      if (res.status === 'success') {
        if (!codDocumento && res.coddocumento) {
          setCodDocumento(res.coddocumento);
        }
        setSuccess('Línea grabada.');
        setEan('');
        setUnidades('');
        setLote('');
        setCaducidad('');
        setNumBultos('');
        setArticuloInfo(null);
        setTimeout(() => {
          setSuccess(null);
          eanRef.current?.focus();
        }, 1500);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error grabando línea');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizar = async () => {
    if (!codDocumento) return;
    setLoading(true);
    try {
      const res = await finalizarEntrada(codDocumento);
      if (res.status === 'success') {
        setSuccess('Entrada finalizada con éxito.');
        setTimeout(() => {
          navigate(-1);
        }, 2000);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al finalizar');
    } finally {
      setLoading(false);
    }
  };

  const handleVerLineasGrabadas = async () => {
    if (!codDocumento) return;
    setLoading(true);
    try {
      const res = await getLineasGrabadas(codDocumento);
      if (res.status === 'success') {
        setLineasGrabadas(res.lineas || []);
        setShowLineasGrabadas(true);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Error al cargar líneas grabadas');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalleLinea = async (codlineadocumentoproveedor) => {
    setLoading(true);
    try {
      const res = await getDetalleLinea(codlineadocumentoproveedor);
      if (res.status === 'success') {
        setDetalleLinea(res.detalle || []);
        setShowDetalleLinea(true);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Error al cargar detalle de línea');
    } finally {
      setLoading(false);
    }
  };

  const handleVerLineasPendientes = async () => {
    if (!codDocumento) return;
    setLoading(true);
    try {
      const res = await getLineasPendientes(codDocumento);
      if (res.status === 'success') {
        setLineasPendientes(res.lineas || []);
        setShowLineasPendientes(true);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Error al cargar líneas pendientes');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      if (step === 5 && codDocumento) {
        // Vuelve a albaranes en curso
        setCodDocumento(null);
        setEan('');
        cargarAlbaranesEnCurso(selectedMuelle?.CODMUELLE || 0);
      } else if (step === 4) {
        if (!selectedPedido) {
          setStep(3.5);
        } else {
          setStep(3);
        }
      } else if (step === 3.5) {
        setStep(3);
      } else if (step === 3) {
        if (albaranesCurso.length > 0) {
          setStep(2);
        } else {
          if (parametros['1745'] === '0') {
            navigate(-1);
          } else {
            setStep(1);
          }
        }
      } else if (step === 2) {
        if (parametros['1745'] === '0') {
          navigate(-1);
        } else {
          setStep(1);
        }
      }
      setError(null);
      setSuccess(null);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-brand-light relative">
      <TerminalHeader title="ENTRADA MERCANCÍA" />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-24">
        <div className="flex justify-start mb-2">
          <button onClick={goBack} className="p-2 bg-white shadow rounded border border-gray-300 text-sga-dark flex items-center gap-2">
            <ArrowLeft className="w-6 h-6" /> <span className="font-bold">Volver</span>
          </button>
        </div>
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded border border-red-200 flex items-center gap-2 font-semibold">
            <AlertTriangle className="shrink-0" size={20} /> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-800 p-3 rounded border border-green-200 flex items-center gap-2 font-semibold">
            <CheckCircle className="shrink-0" size={20} /> {success}
          </div>
        )}
        {loading && (
          <div className="flex justify-center p-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sga-primary"></div>
          </div>
        )}

        {/* STEP 1: Muelle */}
        {step === 1 && (
          <div className="bg-white p-4 rounded shadow border-l-4 border-sga-primary">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-800">
              <Truck size={24}/> Seleccione Muelle
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {muelles.map(m => (
                <button 
                  key={m.CODMUELLE} 
                  onClick={() => handleMuelleSelect(m)}
                  className="p-4 bg-gray-50 border border-gray-200 rounded text-left font-bold text-lg hover:bg-sga-primary hover:text-white transition-colors"
                >
                  {m.DESCRIPCION}
                </button>
              ))}
              {muelles.length === 0 && !loading && (
                <p className="text-gray-500 italic">No hay muelles configurados para entrada.</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Albaranes en curso */}
        {step === 2 && (
          <div className="bg-white p-4 rounded shadow border-l-4 border-sga-primary h-full flex flex-col relative">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-800">
              <FileText size={24}/> Albaranes en Curso ({selectedMuelle?.DESCRIPCION})
            </h2>
            <div className="flex-1 overflow-y-auto pb-16 space-y-2">
              {albaranesCurso.map(alb => (
                <button 
                  key={alb.CODDOCUMENTO} 
                  onClick={() => handleAlbaranCursoSelect(alb)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded text-left hover:bg-sga-primary hover:text-white transition-colors flex flex-col gap-1"
                >
                  <div className="font-bold text-lg">{alb.RAZONSOCIAL}</div>
                  <div className="text-sm font-semibold flex justify-between">
                    <span>Alb: {alb.NUMDOCUMENTO}</span>
                    <span>{alb.FECHADOCUMENTO}</span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Botón flotante para nueva entrada */}
            <button 
              onClick={handleNuevaEntrada}
              className="absolute bottom-6 right-6 bg-sga-primary text-white rounded-full p-5 shadow-2xl hover:bg-blue-800 transition-colors flex items-center justify-center border-4 border-white"
            >
              <PlusCircle size={40} strokeWidth={3} />
            </button>
          </div>
        )}

        {/* STEP 3: Pedidos Pendientes (Nueva Entrada) */}
        {step === 3 && (
          <div className="bg-white p-4 rounded shadow border-l-4 border-sga-primary">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Pedidos Pendientes</h2>
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto mb-4">
              {proveedores.map(p => (
                <button 
                  key={p.CODDOCUMENTO} 
                  onClick={() => handleProveedorSelect(p)}
                  className="p-3 bg-gray-50 border border-gray-200 rounded text-left hover:bg-sga-primary hover:text-white transition-colors"
                >
                  <div className="font-bold text-lg">{p.RAZONSOCIAL}</div>
                  <div className="text-sm font-semibold flex justify-between">
                    <span>Pedido: {p.NUMDOCUMENTO}</span>
                    <span>{p.FECHADOCUMENTO}</span>
                  </div>
                </button>
              ))}
              {proveedores.length === 0 && !loading && (
                <p className="text-gray-500 italic">No hay pedidos pendientes de recepcionar.</p>
              )}
            </div>
            
            {canCreateSinPedido && (
              <button 
                onClick={handleSinPedido}
                className="w-full p-4 bg-gray-200 border-2 border-dashed border-gray-400 rounded font-bold text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-300 mt-2"
              >
                <PlusCircle size={20}/> Entrada Sin Pedido
              </button>
            )}
          </div>
        )}

        {/* STEP 3.5: Proveedores (Sin Pedido) */}
        {step === 3.5 && (
          <div className="bg-white p-4 rounded shadow border-l-4 border-sga-primary h-full flex flex-col relative">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Seleccione Proveedor</h2>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
                <input 
                  type="text"
                  placeholder="Buscar proveedor..."
                  className="w-full border border-gray-300 rounded p-2 pl-10 focus:border-sga-primary outline-none"
                  value={filtroProveedor}
                  onChange={(e) => setFiltroProveedor(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pb-16 space-y-2">
              {todosProveedores.filter(p => {
                const searchStr = filtroProveedor.toLowerCase();
                const rs = (p.RAZONSOCIAL || '').toLowerCase();
                const nc = (p.NOMBRECOMERCIAL || '').toLowerCase();
                const cod = (p.CODPROVEEDORAPLICACION || '').toLowerCase();
                return rs.includes(searchStr) || nc.includes(searchStr) || cod.includes(searchStr);
              }).map(p => (
                <button 
                  key={p.CODPROVEEDOR} 
                  onClick={() => handleProveedorSinPedidoSelect(p)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded text-left hover:bg-sga-primary hover:text-white transition-colors flex flex-col gap-1"
                >
                  <div className="font-bold text-lg">{p.CODPROVEEDORAPLICACION ? `${p.CODPROVEEDORAPLICACION} - ` : ''}{p.RAZONSOCIAL}</div>
                  {p.NOMBRECOMERCIAL && <div className="text-sm font-semibold opacity-80">{p.NOMBRECOMERCIAL}</div>}
                </button>
              ))}
              {todosProveedores.length === 0 && !loading && (
                <p className="text-gray-500 italic">No hay proveedores registrados.</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Albarán */}
        {step === 4 && (
          <div className="bg-white p-4 rounded shadow border-l-4 border-sga-primary">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Datos de Cabecera</h2>
            <div className="bg-gray-50 p-3 rounded mb-4 text-sm font-semibold text-gray-600">
              <div>Prov: {selectedProveedor?.RAZONSOCIAL}</div>
              {parametros['1745'] !== '0' && <div>Muelle: {selectedMuelle?.DESCRIPCION}</div>}
              <div>Pedido: {selectedPedido ? `ID ${selectedPedido}` : 'Sin Pedido'}</div>
            </div>
            
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Número de Albarán *</label>
                <input 
                  ref={albaranRef}
                  type="text" 
                  inputMode={isKeyboardOpen ? "text" : "none"}
                  className="w-full border-2 border-gray-300 p-2 rounded text-lg focus:border-sga-primary focus:outline-none uppercase"
                  placeholder="Escriba Albarán..."
                  value={numAlbaran}
                  onChange={(e) => setNumAlbaran(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if(e.key==='Enter') handleCrearAlbaran() }}
                />
              </div>

              {parametros['1745'] === '0' && (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Muelle *</label>
                  <select 
                    className="w-full border-2 border-gray-300 p-2 rounded text-lg focus:border-sga-primary focus:outline-none bg-white"
                    value={selectedMuelle?.CODMUELLE || ''}
                    onChange={e => {
                      const mu = muelles.find(m => m.CODMUELLE === parseInt(e.target.value));
                      setSelectedMuelle(mu || null);
                    }}
                  >
                    <option value="">Seleccione Muelle...</option>
                    {muelles.map(m => (
                      <option key={m.CODMUELLE} value={m.CODMUELLE}>{m.DESCRIPCION}</option>
                    ))}
                  </select>
                </div>
              )}

              {parametros['1687'] !== '0' && (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Fecha Albarán</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="DD o DDMM o DDMMAA"
                    className="w-full border-2 border-gray-300 p-2 rounded text-lg focus:border-sga-primary focus:outline-none"
                    value={fechaAlbaran}
                    onChange={e => setFechaAlbaran(e.target.value)}
                    onBlur={() => setFechaAlbaran(parseShorthandDate(fechaAlbaran))}
                  />
                </div>
              )}
              
              {parametros['1693'] !== '0' && (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Fecha Recepción</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="DD o DDMM o DDMMAA"
                    className="w-full border-2 border-gray-300 p-2 rounded text-lg focus:border-sga-primary focus:outline-none"
                    value={fechaRecepcion}
                    onChange={e => setFechaRecepcion(e.target.value)}
                    onBlur={() => setFechaRecepcion(parseShorthandDate(fechaRecepcion))}
                  />
                </div>
              )}

              {parametros['1702'] !== '0' && (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Núm Expedición</label>
                  <input 
                    type="text" 
                    className="w-full border-2 border-gray-300 p-2 rounded text-lg focus:border-sga-primary focus:outline-none uppercase"
                    value={numExpedicion}
                    onChange={e => setNumExpedicion(e.target.value.toUpperCase())}
                  />
                </div>
              )}
            </div>

            <button 
              onClick={handleCrearAlbaran}
              className="mt-4 w-full p-3 bg-sga-primary text-white rounded font-bold text-lg"
              disabled={loading}
            >
              Confirmar e Iniciar
            </button>
          </div>
        )}

        {/* STEP 5: Lectura de Líneas */}
        {step === 5 && (
          <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <span className="font-bold text-gray-700">Alb: {numAlbaran}</span>
              {numPedidoAsociado ? (
                <span className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-bold">Ped: {numPedidoAsociado}</span>
              ) : (
                <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded font-bold">Doc: {codDocumento}</span>
              )}
            </div>

            <div className="space-y-4">

              {!articuloInfo ? (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">EAN / Artículo</label>
                  <ArticleSearchInput 
                    onArticleSelected={(article) => {
                      if (article.FECHADESCATALOGACION) {
                        const param1753 = parametros['1753'] || '0';
                        if (String(param1753) === '0') {
                          setError(`El código está descatalogado desde ${new Date(article.FECHADESCATALOGACION).toLocaleDateString()} y no se permite su entrada.`);
                          return; // Bloquea la entrada
                        } else {
                          setError(`ATENCIÓN: Código descatalogado desde ${new Date(article.FECHADESCATALOGACION).toLocaleDateString()}.`);
                        }
                      } else {
                        setError(null);
                      }
                      setArticuloInfo(article);
                      setEan(article.CODARTICULOAPLICACION);
                      setTimeout(() => unidadesRef.current?.focus(), 100);
                    }}
                    autoFocus
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className={articuloInfo.FECHADESCATALOGACION ? "bg-orange-50 p-3 rounded border border-orange-500 shadow-sm" : "bg-blue-50 p-3 rounded border border-sga-blue shadow-sm"}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className={articuloInfo.FECHADESCATALOGACION ? "font-bold text-orange-600 text-lg" : "font-bold text-sga-blue text-lg"}>{articuloInfo.CODARTICULOAPLICACION}</span>
                      <div className="text-sm font-semibold text-gray-700 leading-tight">{articuloInfo.NOMBREARTICULO || articuloInfo.DESCRIPCION}</div>
                    </div>
                    <button 
                      onClick={() => {
                        setArticuloInfo(null);
                        setEan('');
                      }} 
                      className="bg-red-500 text-white px-3 py-1 rounded font-bold text-sm shadow hover:bg-red-600 transition-colors"
                    >
                      CAMBIAR
                    </button>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Unidades</label>
                <div className="flex items-center gap-2">
                  <input 
                    ref={unidadesRef}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="flex-1 border border-gray-300 p-3 rounded text-lg focus:border-sga-primary focus:outline-none"
                    value={unidades}
                    onChange={(e) => setUnidades(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (articuloInfo?.PRM_TRAZABILIDAD !== 0) loteRef.current?.focus();
                        else if (articuloInfo?.GESTIONARCADUCIDAD !== 0) caducidadRef.current?.focus();
                        else handleGrabarLinea();
                      }
                    }}
                  />
                  {articuloInfo && articuloInfo.UNIDADES > 1 && (
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded border border-blue-200 whitespace-nowrap">
                      <span className="text-gray-600 font-bold text-lg">x {articuloInfo.UNIDADES}</span>
                      {unidades && !isNaN(parseInt(unidades, 10)) && (
                        <>
                          <span className="text-gray-400 font-bold text-lg">=</span>
                          <span className="text-blue-700 font-black text-xl">{parseInt(unidades, 10) * articuloInfo.UNIDADES}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {(articuloInfo?.PRM_TRAZABILIDAD !== 0 || articuloInfo?.GESTIONARCADUCIDAD !== 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {articuloInfo?.PRM_TRAZABILIDAD !== 0 && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Lote</label>
                      <input 
                        ref={loteRef}
                        type="text" 
                        inputMode={isKeyboardOpen ? "text" : "none"}
                        className="w-full border border-gray-300 p-2 rounded focus:border-sga-primary uppercase"
                        value={lote}
                        onChange={(e) => setLote(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (articuloInfo?.GESTIONARCADUCIDAD !== 0) caducidadRef.current?.focus();
                            else handleGrabarLinea();
                          }
                        }}
                      />
                    </div>
                  )}
                  {articuloInfo?.GESTIONARCADUCIDAD !== 0 && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Caducidad</label>
                      <input 
                        ref={caducidadRef}
                        type="text" 
                        inputMode="numeric"
                        placeholder="DD, DDMM o DDMMAA"
                        className="w-full border border-gray-300 p-2 rounded focus:border-sga-primary"
                        value={caducidad}
                        onChange={(e) => setCaducidad(e.target.value)}
                        onBlur={() => setCaducidad(parseShorthandDate(caducidad))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setCaducidad(parseShorthandDate(caducidad)); // Parse if enter pressed immediately
                            setTimeout(() => handleGrabarLinea(), 50);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 p-3 bg-gray-50 border border-gray-200 rounded mt-2">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Modo Entrada</label>
                  <div className="flex bg-white border border-gray-300 rounded overflow-hidden">
                    <button 
                      onClick={() => setIsPalet(false)}
                      className={`flex-1 py-2 font-bold text-sm ${!isPalet ? 'bg-sga-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      Normal
                    </button>
                    <button 
                      onClick={() => setIsPalet(true)}
                      className={`flex-1 py-2 font-bold text-sm ${isPalet ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      Palet
                    </button>
                  </div>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nº Veces</label>
                  <input 
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="1"
                    className="w-full border border-gray-300 p-2 rounded text-center focus:border-sga-primary"
                    value={numBultos}
                    onChange={(e) => setNumBultos(e.target.value === '' ? '' : parseInt(e.target.value))}
                  />
                </div>
              </div>

              <button 
                onClick={handleGrabarLinea}
                className="w-full p-4 mt-2 bg-green-600 text-white rounded font-bold text-lg flex justify-center items-center gap-2 hover:bg-green-700"
                disabled={loading}
              >
                <Save size={24} /> Grabar Línea
              </button>

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={handleVerLineasGrabadas}
                  className="flex-1 p-3 bg-blue-100 text-blue-800 font-bold rounded border border-blue-300 hover:bg-blue-200"
                >
                  Ver Lín. Grabadas
                </button>
                { (selectedPedido || numPedidoAsociado) && (
                  <button 
                    onClick={handleVerLineasPendientes}
                    className="flex-1 p-3 bg-purple-100 text-purple-800 font-bold rounded border border-purple-300 hover:bg-purple-200"
                  >
                    Ver Pendientes
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL LÍNEAS GRABADAS */}
        {showLineasGrabadas && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex flex-col p-4">
            <div className="bg-white flex-1 rounded-lg shadow-xl flex flex-col overflow-hidden">
              <div className="p-4 bg-blue-800 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">Líneas Grabadas</h3>
                <button onClick={() => setShowLineasGrabadas(false)} className="p-1 hover:bg-blue-700 rounded"><XCircle size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-100">
                {lineasGrabadas.length === 0 ? (
                  <p className="text-center text-gray-500 mt-4">No hay líneas grabadas.</p>
                ) : (
                  lineasGrabadas.map((l, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleVerDetalleLinea(l.CODLINEADOCUMENTOPROVEEDOR)}
                      className="w-full bg-white p-3 rounded shadow border border-gray-200 text-left active:bg-gray-50"
                    >
                      <div className="font-bold text-gray-800">{l.NOMBREARTICULO}</div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Cód: {l.CODARTICULOAPLICACION}</span>
                        <span className="font-semibold text-sga-primary">Ped: {l.CANTSOLICITADA} | Rec: {l.CANTSERVIDA}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DETALLE LÍNEA */}
        {showDetalleLinea && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex flex-col justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl flex flex-col max-h-[80%] overflow-hidden">
              <div className="p-4 bg-indigo-800 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">Detalle de Línea</h3>
                <button onClick={() => setShowDetalleLinea(false)} className="p-1 hover:bg-indigo-700 rounded"><XCircle size={24}/></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3 bg-gray-50">
                {detalleLinea.length === 0 ? (
                  <p className="text-center text-gray-500">No hay detalle para esta línea.</p>
                ) : (
                  detalleLinea.map((d, i) => (
                    <div key={i} className="bg-white p-3 rounded shadow border border-indigo-100">
                      <div className="font-bold text-sm text-gray-700 mb-1">SSCC: {d.SSCC || 'N/A'}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Uds:</span> <span className="font-semibold">{d.CANTSERVIDA}</span></div>
                        <div><span className="text-gray-500">Lote:</span> <span className="font-semibold">{d.LOTE || '-'}</span></div>
                        <div><span className="text-gray-500">Cad:</span> <span className="font-semibold">{d.FECHACADUCIDAD || '-'}</span></div>
                        <div><span className="text-gray-500">Muelle:</span> <span className="font-semibold">{d.CODMUELLE}</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL LÍNEAS PENDIENTES */}
        {showLineasPendientes && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex flex-col p-4">
            <div className="bg-white flex-1 rounded-lg shadow-xl flex flex-col overflow-hidden">
              <div className="p-4 bg-purple-800 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">Pendiente de Pedido</h3>
                <button onClick={() => setShowLineasPendientes(false)} className="p-1 hover:bg-purple-700 rounded"><XCircle size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-100">
                {lineasPendientes.length === 0 ? (
                  <p className="text-center text-gray-500 mt-4">No hay líneas pendientes de recibir.</p>
                ) : (
                  lineasPendientes.map((l, i) => (
                    <div key={i} className="bg-white p-3 rounded shadow border border-purple-200">
                      <div className="font-bold text-gray-800 leading-tight">{l.NOMBREARTICULO}</div>
                      <div className="flex justify-between text-sm mt-2 items-end">
                        <span className="text-gray-500">Cód: {l.CODARTICULOAPLICACION}</span>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Pedidas: {l.CANTSOLICITADA}</div>
                          <div className="text-xs text-blue-600 font-semibold">Recibidas: {l.CANTSERVIDA ?? 0}</div>
                          <div className="font-bold text-purple-700">Faltan: {l.CANTPDTESERVIR}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
