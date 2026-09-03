import React from 'react';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';

interface ClearConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClearConfirmModal: React.FC<ClearConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-modal-title"
    >
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 overflow-hidden">
        
        <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 shrink-0 border border-rose-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 id="clear-modal-title" className="text-base sm:text-lg font-bold text-slate-900 font-mono uppercase tracking-wide">
              Limpar Cálculo de Produção?
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Esta ação removerá todos os transformadores e quantidades informadas.
            </p>
          </div>
        </div>

        <div className="my-4 text-sm text-slate-700">
          Tem certeza de que deseja resetar a calculadora para o estado inicial? Todos os itens atuais serão descartados.
        </div>

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
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            LIMPAR TUDO
          </button>
        </div>

      </div>
    </div>
  );
};
