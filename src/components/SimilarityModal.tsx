import React from 'react';
import { AlertTriangle, Check, X, Info } from 'lucide-react';
import { MatchedCandidate } from '../types';
import { formatBrNumber, formatUnitTime } from '../utils/calculations';

interface SimilarityModalProps {
  isOpen: boolean;
  searchedCode: string;
  candidate: MatchedCandidate | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SimilarityModal: React.FC<SimilarityModalProps> = ({
  isOpen,
  searchedCode,
  candidate,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !candidate) return null;

  const { transformer, similarityPercentage, confidenceLevel } = candidate;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="similarity-modal-title"
    >
      <div className="bg-white border border-amber-300 rounded-xl shadow-2xl max-w-lg w-full p-5 sm:p-6 overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 shrink-0 border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 id="similarity-modal-title" className="text-base sm:text-lg font-bold text-slate-900 font-mono uppercase tracking-wide flex items-center gap-2">
              CÓDIGO NÃO ENCONTRADO
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              O código exato pesquisado não consta na base de dados. Foi localizada uma sugestão estrutural semelhante.
            </p>
          </div>
        </div>

        {/* Code Comparison Card */}
        <div className="my-4 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200">
            {/* Pesquisado */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1 font-semibold">
                Código Pesquisado:
              </span>
              <div className="text-sm sm:text-base font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                {searchedCode}
              </div>
            </div>

            {/* Sugerido */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1 font-semibold">
                Código Semelhante:
              </span>
              <div className="text-sm sm:text-base font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center justify-between">
                <span>{transformer.modelo}</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                  {transformer.linha}
                </span>
              </div>
            </div>
          </div>

          {/* Similarity score badge */}
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
            <span className="text-xs font-mono text-slate-600 font-medium">
              Índice de Similaridade:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-amber-800">
                {formatBrNumber(similarityPercentage, 2)}%
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                confidenceLevel === 'HIGH'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : confidenceLevel === 'MODERATE'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                {confidenceLevel === 'HIGH' 
                  ? 'ALTA SIMILARIDADE' 
                  : confidenceLevel === 'MODERATE'
                    ? 'ATENÇÃO — SIMILARIDADE MODERADA'
                    : 'BAIXA SIMILARIDADE (<80%)'}
              </span>
            </div>
          </div>

          {/* Model Technical Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
              <span className="text-[10px] font-mono text-slate-500 block uppercase font-medium">Tempo AT</span>
              <span className="text-xs font-mono font-bold text-blue-700">
                {formatUnitTime(transformer.tempo_padrao_at)}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
              <span className="text-[10px] font-mono text-slate-500 block uppercase font-medium">Tempo BT</span>
              <span className="text-xs font-mono font-bold text-blue-700">
                {formatUnitTime(transformer.tempo_padrao_bt)}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
              <span className="text-[10px] font-mono text-slate-500 block uppercase font-medium">Classe</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                {transformer.classe || 'N/A'}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
              <span className="text-[10px] font-mono text-slate-500 block uppercase font-medium">Linha</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                {transformer.linha}
              </span>
            </div>
          </div>

          {confidenceLevel === 'LOW' && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-xs text-rose-800 font-mono">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>
                Aviso: A similaridade calculada está abaixo do limite de 80%. Recomenda-se confirmar o código com a engenharia de processos.
              </span>
            </div>
          )}

        </div>

        {/* Prompt question */}
        <p className="text-sm text-slate-800 font-semibold text-center my-3">
          Deseja utilizar este código sugerido na produção?
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono text-xs uppercase tracking-wider font-semibold border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <X className="w-4 h-4" />
            CANCELAR
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs uppercase tracking-wider font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Check className="w-4 h-4" />
            USAR CÓDIGO SUGERIDO
          </button>
        </div>

      </div>
    </div>
  );
};
