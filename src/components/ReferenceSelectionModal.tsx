import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, AlertOctagon, Check, X, CheckSquare, Square, Calculator, Sparkles } from 'lucide-react';
import { CoilType, ReferenceCandidate, Transformador } from '../types';
import { formatBrNumber, formatUnitTime } from '../utils/calculations';
import { extractFamilyAndSequence } from '../services/transformerService';

export type ReferenceModalContext = 'CODE_NOT_FOUND' | 'MISSING_TIME';

interface ReferenceSelectionModalProps {
  isOpen: boolean;
  context: ReferenceModalContext;
  searchedCode: string;
  coilType: CoilType;
  candidates: ReferenceCandidate[];
  onConfirm: (selectedTransformers: Transformador[], calculatedTime: number) => void;
  onCancel: () => void;
}

export const ReferenceSelectionModal: React.FC<ReferenceSelectionModalProps> = ({
  isOpen,
  context,
  searchedCode,
  coilType,
  candidates,
  onConfirm,
  onCancel,
}) => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // Quando abre ou mudam os candidatos, pré-seleciona o primeiro candidato mais próximo
  useEffect(() => {
    if (isOpen) {
      // Desfoca imediatamente qualquer input ativo para garantir o recolhimento do teclado virtual no mobile
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      if (candidates.length > 0) {
        // Pré-seleciona a referência de maior prioridade (primeira da lista)
        setSelectedModels([candidates[0].transformer.modelo]);
      } else {
        setSelectedModels([]);
      }
    } else {
      setSelectedModels([]);
    }
  }, [isOpen, candidates]);

  // Lista dos transformadores selecionados
  const selectedTransformers = useMemo(() => {
    return candidates
      .filter((c) => selectedModels.includes(c.transformer.modelo))
      .map((c) => c.transformer);
  }, [candidates, selectedModels]);

  // Cálculo da média ou tempo unitário original
  const calculatedResult = useMemo(() => {
    if (selectedTransformers.length === 0) {
      return {
        unitTime: null,
        methodText: 'Nenhuma referência selecionada',
        formulaText: '',
      };
    }

    const times = selectedTransformers
      .map((t) => (coilType === 'AT' ? t.tempo_padrao_at : t.tempo_padrao_bt))
      .filter((t): t is number => typeof t === 'number' && !isNaN(t) && t > 0);

    if (times.length === 0) {
      return {
        unitTime: null,
        methodText: 'Nenhum tempo válido encontrado',
        formulaText: '',
      };
    }

    if (times.length === 1) {
      return {
        unitTime: times[0],
        methodText: 'Tempo original do código de referência',
        formulaText: `${formatBrNumber(times[0], { min: 2, max: 4 })} min/un`,
      };
    }

    // Média de 2 ou mais (cálculo sobre valores numéricos originais sem arredondamento prévio)
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const formattedTerms = times.map((t) => formatBrNumber(t, { min: 2, max: 4 })).join(' + ');
    const formattedAvg = formatBrNumber(avg, { min: 2, max: 4 });
    const formula = `(${formattedTerms}) / ${times.length} = ${formattedAvg} min/un`;

    return {
      unitTime: avg,
      methodText: 'Tempo calculado pela média das referências selecionadas.',
      formulaText: formula,
    };
  }, [selectedTransformers, coilType]);

  if (!isOpen) return null;

  const toggleSelect = (modelCode: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelCode)) {
        return prev.filter((m) => m !== modelCode);
      } else {
        return [...prev, modelCode];
      }
    });
  };

  const handleConfirm = () => {
    if (selectedTransformers.length === 0 || calculatedResult.unitTime === null) {
      return;
    }
    onConfirm(selectedTransformers, calculatedResult.unitTime);
  };

  const isNotFound = context === 'CODE_NOT_FOUND';
  const coilLabel = coilType === 'AT' ? 'AT (Alta Tensão)' : 'BT (Baixa Tensão)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ref-modal-title"
    >
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-hidden">
        
        {/* Modal Header (Fixo no topo do modal) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white shrink-0 flex items-start gap-3">
          <div className={`p-2.5 rounded-lg shrink-0 border ${
            isNotFound ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {isNotFound ? <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" /> : <AlertOctagon className="w-5 h-5 sm:w-6 sm:h-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="ref-modal-title" className="text-sm sm:text-base md:text-lg font-bold text-slate-900 font-mono uppercase tracking-wide leading-tight">
              {isNotFound ? 'CÓDIGO NÃO ENCONTRADO' : 'CÓDIGO ENCONTRADO — TEMPO NÃO CADASTRADO'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isNotFound ? (
                <>O código exato pesquisado não consta na base de dados.</>
              ) : (
                <>
                  O código <strong className="font-mono text-slate-900">{searchedCode}</strong> existe na base de dados, porém não possui tempo padrão <strong className="font-mono text-blue-700">{coilType}</strong> cadastrado.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Conteúdo Central Rolável (Body) */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-3.5">
          {/* Searched Code Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold uppercase text-slate-500">
                Código Pesquisado:
              </span>
              <span className="text-sm sm:text-base font-mono font-extrabold text-slate-900 bg-white border border-slate-300 px-2.5 py-0.5 rounded-md">
                {searchedCode}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
              <span>Bobina selecionada:</span>
              <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {coilType}
              </span>
            </div>
          </div>

          {/* Instruction subheader */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-600">
            <span className="font-semibold uppercase tracking-wider text-slate-700">
              REFERÊNCIAS ENCONTRADAS:
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Selecione 1 ou mais referências
            </span>
          </div>

          {/* Candidate List with Checkboxes */}
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-2xs">
            {candidates.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-rose-700 bg-rose-50/50 rounded-lg">
                <AlertOctagon className="w-5 h-5 mx-auto mb-1.5 text-rose-600" />
                Nenhum código semelhante foi encontrado dentro da família {extractFamilyAndSequence(searchedCode).familyCode || searchedCode}.
              </div>
            ) : (
              candidates.map((cand) => {
                const isSelected = selectedModels.includes(cand.transformer.modelo);
                const timeForCurrentCoil = cand.currentTime;

                return (
                  <div
                    key={cand.transformer.modelo}
                    onClick={() => toggleSelect(cand.transformer.modelo)}
                    className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        aria-label={`Selecionar referência ${cand.transformer.modelo}`}
                        className="text-blue-600 focus:outline-none shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-700 fill-blue-100" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {cand.transformer.modelo}
                          </span>

                          {/* Relation Tag */}
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            cand.relationType === 'MAIS_PROXIMO'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : cand.relationType === 'ANTERIOR'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : cand.relationType === 'POSTERIOR'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : cand.relationType === 'MESMA_FAMILIA'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {cand.relationLabel}
                            {cand.sequenceDiff !== null && cand.sequenceDiff !== 0 && (
                              <span className="ml-1 opacity-75 font-mono">
                                ({cand.sequenceDiff > 0 ? `+${cand.sequenceDiff}` : cand.sequenceDiff})
                              </span>
                            )}
                          </span>

                          <span className="text-[11px] font-mono text-slate-500">
                            {cand.transformer.linha} • {cand.transformer.classe || '15 KV'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Standard time display for current coil */}
                    <div className="text-right shrink-0 font-mono">
                      <span className="text-xs sm:text-sm font-bold text-blue-700 block">
                        {formatUnitTime(timeForCurrentCoil)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Tempo {coilType}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Real-time calculation / methodology summary box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>METODOLOGIA DE APLICAÇÃO:</span>
            </div>

            {selectedTransformers.length === 0 ? (
              <p className="text-rose-700 font-semibold">
                ⚠️ Selecione ao menos 1 código de referência para prosseguir com o cálculo.
              </p>
            ) : selectedTransformers.length === 1 ? (
              <div className="space-y-1 text-slate-700">
                <div>
                  <strong>Referência Única:</strong> {selectedTransformers[0].modelo}
                </div>
                <div className="text-emerald-700 font-bold">
                  ✓ {calculatedResult.methodText}
                </div>
                <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
                  <span>Tempo a ser utilizado:</span>
                  <span className="text-sm font-extrabold text-blue-700">
                    {formatBrNumber(calculatedResult.unitTime, { min: 2, max: 4 })} min/un
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-slate-700">
                <div>
                  <strong>Referências Selecionadas ({selectedTransformers.length}):</strong>{' '}
                  {selectedTransformers.map((t) => t.modelo).join(' + ')}
                </div>
                <div className="text-amber-800 font-bold">
                  ⚙️ {calculatedResult.methodText}
                </div>
                <div className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200">
                  Fórmula: {calculatedResult.formulaText}
                </div>
                <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
                  <span>Tempo médio a ser utilizado:</span>
                  <span className="text-sm font-extrabold text-blue-700">
                    {formatBrNumber(calculatedResult.unitTime, { min: 2, max: 4 })} min/un
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Fixo de Ações (Sempre visível no mobile e desktop) */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 sm:bg-white shrink-0 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono text-xs uppercase tracking-wider font-semibold border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:bg-slate-100"
          >
            <X className="w-4 h-4" />
            CANCELAR
          </button>
          
          <button
            type="button"
            disabled={selectedTransformers.length === 0 || calculatedResult.unitTime === null}
            onClick={handleConfirm}
            className={`w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedTransformers.length === 0 || calculatedResult.unitTime === null
                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer active:scale-98'
            }`}
          >
            <Check className="w-4 h-4" />
            CONFIRMAR REFERÊNCIAS
          </button>
        </div>

      </div>
    </div>
  );
};
