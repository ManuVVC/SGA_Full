import React from 'react';
import { ScanBarcode, AlignLeft, FileText } from 'lucide-react';

export default function SearchTypeToggle({ value, onChange, inputRef }) {
  const options = [
    { id: 'codfacturacion', label: 'EAN', icon: ScanBarcode },
    { id: 'codarticuloaplicacion', label: 'Interno', icon: FileText },
    { id: 'nombrearticulo', label: 'Descrip.', icon: AlignLeft },
  ];

  return (
    <div className="flex bg-gray-200 p-1 rounded-lg w-full mb-4">
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              onChange(opt.id);
              if (inputRef && inputRef.current) {
                inputRef.current.focus();
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center py-2 rounded-md transition-all duration-200 ${
              isActive 
                ? 'bg-sga-primary text-white shadow-md' 
                : 'text-gray-500 hover:text-sga-dark hover:bg-gray-300'
            }`}
          >
            <opt.icon className="w-5 h-5 mb-1" />
            <span className="text-xs font-bold uppercase tracking-wider">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
