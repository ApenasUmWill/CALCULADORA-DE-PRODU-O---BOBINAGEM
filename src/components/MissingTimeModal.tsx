import React from 'react';
import { AlertOctagon, X, RefreshCw } from 'lucide-react';
import { CoilType, Transformador } from '../types';

interface MissingTimeModalProps {
  isOpen: boolean;
  transformer: Transformador | null;
  coilType: CoilType;
  onClose: () => void;
  onSwitchCoil?: () => void;
}

export const MissingTimeModal: React.FC<MissingTimeModalProps> = ({
  isOpen,
  transformer,
  coilType,
  onClose,
  onSwitchCoil,
}) => {
  if (!isOpen || !transformer) return null;

  const alternateCoil = coilType === 'AT' ? 'BT' : 'AT';
  const alternateTime = alternateCoil === 'AT' ? transformer.tempo_padrao_at : transformer.tempo_padrao_bt;
  const hasAlternate = alternateTime !== null && alternateTime !== undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="missing-time-title"
    >
      <div className="bg-white border border-rose-300 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 overflow-hidden">
        
        <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 shrink-0 border border-rose-200">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h3 id="missing-time-title" className="text-base sm:text-lg font-bold text-slate-900 font-mono uppercase tracking-wide">
              TEMPO PADRÃO NÃO CADASTRADO
            </h3>
            <p className="text-xs text-rose-700 font-mono mt-0.5 font-semibold">
              Impedimento de cálculo operacional
            </p>
          </div>
        </div>

        <div className="my-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2.5 text-slate-700">
          <p>
            O tempo padrão de <strong className="text-blue-700 font-mono">{coilType} ({coilType === 'AT' ? 'Alta Tensão' : 'Baixa Tensão'})</strong> para o modelo <strong className="text-slate-900 font-mono">{transformer.modelo}</strong> ainda não está cadastrado na base de dados (valor nulo).
          </p>
          <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-xs text-rose-800 font-mono font-medium">
            Conforme regra de produção, o sistema <strong>NÃO calcula com valor ausente</strong> e não substitui por zero arbitrário.
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono text-xs uppercase tracking-wider font-semibold border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <X className="w-4 h-4" />
            Fechar / Escolher outro
          </button>
          
          {hasAlternate && onSwitchCoil && (
            <button
              type="button"
              onClick={onSwitchCoil}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
            >
              <RefreshCw className="w-4 h-4" />
              Mudar para {alternateCoil}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
