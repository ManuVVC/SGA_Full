import React, { useState, useEffect } from 'react';
import adminApi from '../../api/adminApi';

export default function FiltrosDinamicos({ coddeffiltro, onFiltroChange, onFiltroGuardadoSelect, isAdmin }) {
  const [definicionFiltros, setDefinicionFiltros] = useState([]);
  const [filtrosGuardados, setFiltrosGuardados] = useState([]);
  const [selectedFiltro, setSelectedFiltro] = useState('');
  const [customValues, setCustomValues] = useState({});
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newFiltroName, setNewFiltroName] = useState('');

  useEffect(() => {
    if (!coddeffiltro) {
      setDefinicionFiltros([]);
      setFiltrosGuardados([]);
      return;
    }

    const fetchData = async () => {
      try {
        const [resFiltros, resDef] = await Promise.all([
          adminApi.get(`/filtros?def=${coddeffiltro}`),
          adminApi.get(`/filtros/definicion?def=${coddeffiltro}`)
        ]);

        if (resFiltros.data?.status === 'success') {
          setFiltrosGuardados(resFiltros.data.data);
        }
        if (resDef.data?.status === 'success') {
          setDefinicionFiltros(resDef.data.data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
  }, [coddeffiltro]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    setSelectedFiltro(val);
    setShowSaveInput(false);
    onFiltroGuardadoSelect(val === 'custom' ? null : val);
    
    if (val !== 'custom') {
      setCustomValues({});
      onFiltroChange({});
    } else {
      onFiltroChange(customValues);
    }
  };

  const handleCustomChange = (coddefcampo, field, value) => {
    const current = customValues[coddefcampo] || { valor: '', comparacion: 1 };
    const newValues = { ...customValues, [coddefcampo]: { ...current, [field]: value } };
    setCustomValues(newValues);
    onFiltroChange(newValues);
  };

  const handleSaveFiltro = async () => {
    if (!newFiltroName) return;
    try {
      const res = await adminApi.post('/filtros', {
        coddeffiltro,
        descripcion: newFiltroName,
        custom_values: customValues
      });
      if (res.data?.status === 'success') {
        const reloadRes = await adminApi.get(`/filtros?def=${coddeffiltro}`);
        if (reloadRes.data?.status === 'success') {
          setFiltrosGuardados(reloadRes.data.data);
        }
        setSelectedFiltro(res.data.codfiltro.toString());
        onFiltroGuardadoSelect(res.data.codfiltro.toString());
        setShowSaveInput(false);
        setNewFiltroName('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!coddeffiltro) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label>Filtro:</label>
        <select value={selectedFiltro} onChange={handleSelectChange} style={{ width: 'auto' }}>
          <option value="">-- Ninguno --</option>
          {definicionFiltros.length > 0 && <option value="custom">-- Personalizado --</option>}
          {filtrosGuardados.map(f => (
            <option key={f.CODFILTRO} value={f.CODFILTRO}>{f.DESCRIPCION}</option>
          ))}
        </select>

        {selectedFiltro === 'custom' && isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!showSaveInput ? (
              <button className="btn-secondary" onClick={() => setShowSaveInput(true)}>Guardar como Filtro</button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Nombre del filtro" 
                  value={newFiltroName} 
                  onChange={e => setNewFiltroName(e.target.value)} 
                />
                <button className="btn-primary" onClick={handleSaveFiltro}>Guardar</button>
                <button className="btn-secondary" onClick={() => setShowSaveInput(false)}>Cancelar</button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedFiltro === 'custom' && definicionFiltros.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {definicionFiltros.map(def => {
            const isDate = def.CODTIPOCAMPOFILTRO === 3;
            const currentVal = customValues[def.CODDEFCAMPO] || { valor: '', comparacion: 1 };
            
            return (
              <div key={def.CODDEFCAMPO} className="form-group" style={{ minWidth: '220px', flex: '1 1 auto' }}>
                <label style={{ fontSize: '0.8rem' }}>{def.DESCRIPCIONCAMPO}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    value={currentVal.comparacion}
                    onChange={e => handleCustomChange(def.CODDEFCAMPO, 'comparacion', parseInt(e.target.value))}
                    style={{ flex: '0 0 auto', width: '90px' }}
                  >
                    <option value={1}>Incluye</option>
                    <option value={2}>Excluye</option>
                    <option value={3}>Pregunta</option>
                  </select>
                  <input 
                    type={isDate ? 'date' : 'text'} 
                    value={currentVal.valor} 
                    onChange={e => handleCustomChange(def.CODDEFCAMPO, 'valor', e.target.value)}
                    placeholder={def.DATAFIELD}
                    disabled={currentVal.comparacion === 3}
                    style={{ flex: '1 1 auto' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
