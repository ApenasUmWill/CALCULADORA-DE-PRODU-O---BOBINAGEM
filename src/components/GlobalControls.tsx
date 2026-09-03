import React from 'react';
import { Clock, Zap, Gauge } from 'lucide-react';
import { CoilType, JornadaType } from '../types';
import { APP_CONFIG } from '../config';

interface GlobalControlsProps {
  jornada: JornadaType;
  onJornadaChange: (jornada: JornadaType) => void;
  coilType: CoilType;
  onCoilTypeChange: (coil: CoilType) => void;
  dailyCapacity: number;
}

export const GlobalControls: React.FC<GlobalControlsProps> = ({
  jornada,
  onJornadaChange,
  coilType,
  onCoilTypeChange,
  dailyCapacity,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center">
        
        {/* 1. SELETOR DE JORNADA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-700 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              JORNADA DE TRABALHO
            </label>
            <span className="text-[11px] font-mono text-slate-600 font-semibold">
              {jornada === 'NORMAL' ? '424 min' : '389 min'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200" role="group" aria-label="Seletor de Jornada">
            <button
              type="button"
              id="btn-jornada-normal"
              onClick={() => onJornadaChange('NORMAL')}
              className={`py-2 px-3 rounded-md text-xs font-mono font-bold uppercase transition-all flex flex-col items-center justify-center cursor-pointer ${
                jornada === 'NORMAL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <span>NORMAL</span>
              <span className={`text-[10px] ${jornada === 'NORMAL' ? 'text-blue-100' : 'text-slate-600 font-semibold'}`}>
                {APP_CONFIG.JORNADA_MINUTES.NORMAL} min
              </span>
            </button>

            <button
              type="button"
              id="btn-jornada-reduzido"
              onClick={() => onJornadaChange('REDUZIDO')}
              className={`py-2 px-3 rounded-md text-xs font-mono font-bold uppercase transition-all flex flex-col items-center justify-center cursor-pointer ${
                jornada === 'REDUZIDO'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <span>REDUZIDO</span>
              <span className={`text-[10px] ${jornada === 'REDUZIDO' ? 'text-blue-100' : 'text-slate-600 font-semibold'}`}>
                {APP_CONFIG.JORNADA_MINUTES.REDUZIDO} min
              </span>
            </button>
          </div>
        </div>

        {/* 2. SELETOR GLOBAL DE BOBINA (AT / BT) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-700 font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              TIPO DE BOBINA (GLOBAL)
            </label>
            <span className="text-[11px] font-mono text-slate-600 font-semibold">
              {coilType === 'AT' ? 'Alta Tensão' : 'Baixa Tensão'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200" role="group" aria-label="Seletor de Tipo de Bobina">
            <button
              type="button"
              id="btn-coil-at"
              onClick={() => onCoilTypeChange('AT')}
              className={`py-2 px-3 rounded-md text-xs font-mono font-bold uppercase transition-all flex flex-col items-center justify-center cursor-pointer ${
                coilType === 'AT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <span>AT</span>
              <span className={`text-[10px] ${coilType === 'AT' ? 'text-blue-100' : 'text-slate-600 font-semibold'}`}>
                Alta Tensão
              </span>
            </button>

            <button
              type="button"
              id="btn-coil-bt"
              onClick={() => onCoilTypeChange('BT')}
              className={`py-2 px-3 rounded-md text-xs font-mono font-bold uppercase transition-all flex flex-col items-center justify-center cursor-pointer ${
                coilType === 'BT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <span>BT</span>
              <span className={`text-[10px] ${coilType === 'BT' ? 'text-blue-100' : 'text-slate-600 font-semibold'}`}>
                Baixa Tensão
              </span>
            </button>
          </div>
        </div>

        {/* 3. CAPACIDADE DIÁRIA DISPONÍVEL */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                CAPACIDADE DIÁRIA
              </span>
              <span className="text-xs font-mono font-semibold text-slate-700">
                Jornada {jornada}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1 font-mono">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {dailyCapacity}
              </span>
              <span className="text-sm font-semibold text-slate-600">
                min
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 block font-medium">
              Tempo total disponível
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
