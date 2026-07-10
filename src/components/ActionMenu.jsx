import React from 'react';
import { Info, Settings2, X } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

export default function ActionMenu({ title, subtitle, isOpen, onClose, onInfo, onAjustes, infoLabel = "Info Artículo" }) {
  const { hasPermission } = usePermissions();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 transition-opacity p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden mb-6 animate-slide-up">
        <div className="bg-sga-primary text-white p-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg leading-tight">{title}</h3>
            {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col gap-3">
          <button 
            onClick={() => { onClose(); onInfo(); }}
            className="flex items-center gap-3 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
              <Info className="w-6 h-6" />
            </div>
            <span className="font-bold text-gray-700 text-lg">{infoLabel}</span>
          </button>

          {hasPermission('PRM_AJUSTESDESTOCK') && (
            <button 
              onClick={() => { onClose(); onAjustes(); }}
              className="flex items-center gap-3 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-brand-olive/10 hover:border-brand-olive transition-colors"
            >
              <div className="bg-brand-olive/20 p-2 rounded-full text-brand-olive">
                <Settings2 className="w-6 h-6" />
              </div>
              <span className="font-bold text-gray-700 text-lg">Ajustes de Stock</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
