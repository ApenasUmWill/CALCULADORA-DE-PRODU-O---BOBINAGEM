import React from 'react';
import { Gauge, Database, Calculator } from 'lucide-react';
import { ItamLogo } from './ItamLogo';
import { JornadaType } from '../types';

interface HeaderProps {
  dailyCapacity?: number;
  jornada?: JornadaType;
  activeView?: 'calculator' | 'admin';
  onToggleView?: (view: 'calculator' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({
  dailyCapacity = 424,
  jornada = 'NORMAL',
  activeView = 'calculator',
  onToggleView,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white relative md:sticky md:top-0 md:z-20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Left: Official ITAM Logo + Title */}
          <div className="flex items-center gap-3.5 sm:gap-5">
            {/* ITAM Logo */}
            <div className="shrink-0">
              <ItamLogo height={46} />
            </div>

            {/* Divider line for desktop */}
            <div className="hidden sm:block h-9 w-[1px] bg-slate-200" />

            {/* Title and Department */}
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 font-['Chakra_Petch',sans-serif]">
                CALCULADORA DE PRODUÇÃO <span className="text-blue-600">—</span> BOBINAGEM
              </h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center gap-1.5 mt-0.5">
                <span>Setor Industrial</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-semibold">Bobinagem</span>
              </p>
            </div>
          </div>

          {/* Right: Dynamic Capacity Badge + Discrete Admin Button */}
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            {onToggleView && (
              <button
                type="button"
                id="btn-admin-base"
                onClick={() => onToggleView(activeView === 'calculator' ? 'admin' : 'calculator')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  activeView === 'admin'
                    ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={activeView === 'calculator' ? 'Acessar área de atualização da base de modelos' : 'Voltar para a calculadora de produção'}
              >
                {activeView === 'calculator' ? (
                  <>
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    <span>Administrar Base</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-3.5 h-3.5 text-blue-600" />
                    <span>Calculadora</span>
                  </>
                )}
              </button>
            )}

            {/* Dynamic Capacity Badge */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-lg shadow-2xs">
              <div className="w-8 h-8 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Gauge className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Jornada {jornada}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-slate-900 font-mono tracking-tight leading-tight">
                    {dailyCapacity}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 font-mono">
                    min disponíveis
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

