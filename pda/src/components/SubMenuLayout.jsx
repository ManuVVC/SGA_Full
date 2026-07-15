import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import apiService from '../api/apiService';

import TerminalHeader from '../components/TerminalHeader';

export default function SubMenuLayout({ title, items }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col flex-1 h-full bg-brand-light">
      <TerminalHeader title={title} />

      {/* MENU ITEMS */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {items.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => {
              if (item.path) {
                navigate(item.path);
              } else {
                console.log(`Función no implementada: ${item.label}`);
              }
            }}
            className="bg-white border border-gray-300 rounded-lg py-3 flex flex-col items-center justify-center shadow-sm active:bg-gray-100 transition-colors"
          >
            {item.icon && (
              <div className="bg-gray-200 rounded-lg p-1.5 mb-1.5">
                <item.icon className="w-6 h-6 text-[#5c4033]" strokeWidth={2.5} />
              </div>
            )}
            <span className="font-black text-sga-dark text-[15px] leading-none">{item.label}</span>
          </button>
        ))}
      </div>

      {/* FOOTER */}
      <div className="bg-brand-olive p-3 shrink-0">
        <button 
          onClick={() => navigate('/menu')}
          className="w-full bg-sga-secondary hover:bg-gray-600 text-white font-bold py-3 rounded shadow-md flex items-center justify-center gap-2 active:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[15px] tracking-wide">VOLVER</span>
        </button>
      </div>
    </div>
  );
}
