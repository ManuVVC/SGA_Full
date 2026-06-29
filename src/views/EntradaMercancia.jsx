import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, Truck, Search, PlusCircle, Save, XCircle, FileText } from 'lucide-react';
import { getMuelles, getAlbaranesEnCurso, getProveedoresPendientes, getPedidosPendientes, crearAlbaran, grabarLineaEntrada, finalizarEntrada, getLineasGrabadas, getDetalleLinea, getLineasPendientes } from '../api/entradasService';
import TerminalHeader from '../components/TerminalHeader';
import { useKeyboard } from '../contexts/KeyboardContext';

export default function EntradaMercancia() {
  const navigate = useNavigate();
  const { isKeyboardOpen } = useKeyboard();

  // Steps: 1 = Muelle, 2 = Albaranes en Curso, 3 = Proveedor/Pedido, 4 = Albaran Nuevo, 5 = Lineas
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Datos globales
  const [muelles, setMuelles] = useState([]);
  const [albaranesCurso, setAlbaranesCurso] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  // Selecciones
  const [selectedMuelle, setSelectedMuelle] = useState(null);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null); // null if 'sin pedido'
  
  // Albaran
  const [numAlbaran, setNumAlbaran] = useState('');
  const [codDocumento, setCodDocumento] = useState(null); // Documento de entrada creado

  // Linea (paso 4)
  const [ean, setEan] = useState('');
  const [unidades, setUnidades] = useState('');
  const [lote, setLote] = useState('');
  const [caducidad, setCaducidad] = useState('');

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

  useEffect(() => {
    cargarMuelles();
  }, []);

  const cargarMuelles = async () => {
    setLoading(true);
    try {
      const res = await getMuelles();
      setMuelles(res.muelles || []);
      if (res.muelles?.length === 1) {
        setSelectedMuelle(res.muelles[0]);
        cargarAlbaranesEnCurso(res.muelles[0].CODMUELLE);
      }
    } catch (err) {
      setError('Error al cargar muelles');
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
    setNumAlbaran(alb.NUMDOCUMENTOENTRADA);
    setSelectedProveedor({ RAZONSOCIAL: alb.RAZONSOCIAL });
    setStep(5);
    setTimeout(() => eanRef.current?.focus(), 100);
  };

  const handleProveedorSelect = (p) => {
    setSelectedProveedor(p);
    cargarPedidos(p.CODPROVEEDOR);
  };

  const handlePedidoSelect = (pedidoId) => {
    setSelectedPedido(pedidoId);
    setStep(4);
    setTimeout(() => albaranRef.current?.focus(), 100);
  };

  const handleSinPedido = () => {
    setSelectedPedido(null);
    setStep(4);
    setTimeout(() => albaranRef.current?.focus(), 100);
  };

  const handleCrearAlbaran = async () => {
    if (!numAlbaran.trim()) {
      setError("Introduzca número de albarán");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await crearAlbaran({
        NUMALBARAN: numAlbaran,
        CODPROVEEDOR: selectedProveedor.CODPROVEEDOR,
        CODMUELLE: selectedMuelle.CODMUELLE,
        CODPEDIDO: selectedPedido
      });
      if (res.status === 'success') {
        setCodDocumento(res.coddocumento);
        setStep(5);
        setTimeout(() => eanRef.current?.focus(), 100);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar albarán');
    } finally {
      setLoading(false);
    }
  };

  const handleGrabarLinea = async () => {
    if (!ean.trim() || !unidades) {
      setError('EAN y Unidades son obligatorios');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await grabarLineaEntrada({
        CODDOCUMENTO: codDocumento,
        EAN: ean,
        UNIDADES: parseInt(unidades, 10),
        NUMEROLOTE: lote || null,
        FECHACADUCIDAD: caducidad || null
      });
      if (res.status === 'success') {
        setSuccess('Línea grabada.');
        setEan('');
        setUnidades('');
        setLote('');
        setCaducidad('');
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
        cargarAlbaranesEnCurso(selectedMuelle.CODMUELLE);
      } else if (step === 4) {
        setStep(3);
      } else if (step === 3) {
        if (albaranesCurso.length > 0) {
          setStep(2);
        } else {
          setStep(1);
        }
      } else if (step === 2) {
        setStep(1);
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
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sga-blue"></div>
          </div>
        )}

        {/* STEP 1: Muelle */}
        {step === 1 && (
          <div className="bg-white p-4 rounded shadow border-l-4 border-sga-blue">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-800">
              <Truck size={24}/> Seleccione Muelle
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {muelles.map(m => (
                <button 
                  key={m.CODMUELLE} 
                  onClick={() => handleMuelleSelect(m)}
                  className="p-4 bg-gray-50 border border-gray-200 rounded text-left font-bold text-lg hover:bg-sga-blue hover:text-white transition-colors"
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
          <div className="bg-white p-4 rounded shadow border-l-4 border-sga-blue h-full flex flex-col relative">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-800">
              <FileText size={24}/> Albaranes en Curso ({selectedMuelle?.DESCRIPCION})
            </h2>
            <div className="flex-1 overflow-y-auto pb-16 space-y-2">
              {albaranesCurso.map(alb => (
                <button 
                  key={alb.CODDOCUMENTO} 
                  onClick={() => handleAlbaranCursoSelect(alb)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded text-left hover:bg-sga-blue hover:text-white transition-colors flex flex-col gap-1"
                >
                  <div className="font-bold text-lg">{alb.RAZONSOCIAL}</div>
                  <div className="text-sm font-semibold flex justify-between">
                    <span>Alb: {alb.NUMDOCUMENTOENTRADA}</span>
                    <span>{alb.FECHADOCUMENTO}</span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Botón flotante para nueva entrada */}
            <button 
              onClick={handleNuevaEntrada}
              className="absolute bottom-4 right-4 bg-sga-blue text-white rounded-full p-4 shadow-lg hover:bg-blue-800 transition-colors flex items-center justify-center"
            >
              <PlusCircle size={32} />
            </button>
          </div>
        )}

        {/* STEP 3: Proveedor y Pedido (Nueva Entrada) */}
        {step === 3 && (
          <div className="bg-white p-4 rounded shadow border-l-4 border-sga-blue">
            {!selectedProveedor ? (
              <>
                <h2 className="text-lg font-bold mb-3 text-gray-800">Proveedores con Pedidos (Est.14)</h2>
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                  {proveedores.map(p => (
                    <button 
                      key={p.CODPROVEEDOR} 
                      onClick={() => handleProveedorSelect(p)}
                      className="p-3 bg-gray-50 border border-gray-200 rounded text-left font-semibold hover:bg-sga-blue hover:text-white transition-colors"
                    >
                      {p.RAZONSOCIAL}
                    </button>
                  ))}
                  {proveedores.length === 0 && !loading && (
                    <p className="text-gray-500 italic">No hay pedidos pendientes de recepcionar.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800">{selectedProveedor.RAZONSOCIAL}</h2>
                  <button onClick={() => setSelectedProveedor(null)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <XCircle size={24}/>
                  </button>
                </div>
                
                <h3 className="font-semibold text-gray-600 mb-2">Seleccione Pedido:</h3>
                <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
                  {pedidos.map(ped => (
                    <button 
                      key={ped.CODDOCUMENTO} 
                      onClick={() => handlePedidoSelect(ped.CODDOCUMENTO)}
                      className="p-3 bg-indigo-50 border border-indigo-200 rounded text-left font-bold text-indigo-900 hover:bg-indigo-600 hover:text-white transition-colors"
                    >
                      Pedido: {ped.NUMDOCUMENTO} <span className="text-sm font-normal block">{ped.FECHADOCUMENTO}</span>
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={handleSinPedido}
                  className="w-full p-4 bg-gray-200 border-2 border-dashed border-gray-400 rounded font-bold text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-300"
                >
                  <PlusCircle size={20}/> Entrada Sin Pedido
                </button>
              </>
            )}
          </div>
        )}

        {/* STEP 4: Albarán */}
        {step === 4 && (
          <div className="bg-white p-4 rounded shadow border-l-4 border-sga-blue">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Número de Albarán</h2>
            <div className="bg-gray-50 p-3 rounded mb-4 text-sm font-semibold text-gray-600">
              <div>Prov: {selectedProveedor?.RAZONSOCIAL}</div>
              <div>Muelle: {selectedMuelle?.DESCRIPCION}</div>
              <div>Pedido: {selectedPedido ? `ID ${selectedPedido}` : 'Sin Pedido'}</div>
            </div>
            
            <input 
              ref={albaranRef}
              type="text" 
              inputMode={isKeyboardOpen ? "text" : "none"}
              className="w-full border-2 border-gray-300 p-3 rounded text-xl focus:border-sga-blue focus:outline-none uppercase font-bold"
              placeholder="Escriba Albarán..."
              value={numAlbaran}
              onChange={(e) => setNumAlbaran(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if(e.key==='Enter') handleCrearAlbaran() }}
            />
            <button 
              onClick={handleCrearAlbaran}
              className="mt-4 w-full p-3 bg-sga-blue text-white rounded font-bold text-lg"
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
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">Doc: {codDocumento}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">EAN / Artículo</label>
                <input 
                  ref={eanRef}
                  type="text" 
                  inputMode={isKeyboardOpen ? "text" : "none"}
                  className="w-full border border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none"
                  value={ean}
                  onChange={(e) => setEan(e.target.value)}
                  onKeyDown={(e) => { if (e.key==='Enter' && ean) unidadesRef.current?.focus() }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Unidades</label>
                <input 
                  ref={unidadesRef}
                  type="number"
                  inputMode="numeric"
                  className="w-full border border-gray-300 p-3 rounded text-lg focus:border-sga-blue focus:outline-none"
                  value={unidades}
                  onChange={(e) => setUnidades(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Lote (Opcional)</label>
                  <input 
                    type="text" 
                    inputMode={isKeyboardOpen ? "text" : "none"}
                    className="w-full border border-gray-300 p-2 rounded focus:border-sga-blue uppercase"
                    value={lote}
                    onChange={(e) => setLote(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Caducidad (Opcional)</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 p-2 rounded focus:border-sga-blue"
                    value={caducidad}
                    onChange={(e) => setCaducidad(e.target.value)}
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
                {selectedPedido && (
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
                        <span className="font-semibold text-sga-blue">Ped: {l.CANTSOLICITADA} | Rec: {l.CANTSERVIDA}</span>
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
