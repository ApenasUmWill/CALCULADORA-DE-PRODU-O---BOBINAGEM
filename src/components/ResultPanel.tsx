import React from 'react';
import { Clock, TrendingUp, AlertTriangle, CheckCircle2, Gauge, Layers, Calculator } from 'lucide-react';
import { CalculationSummary } from '../types';
import { formatBrNumber, formatEfficiency, formatUnitTime, getItemEffectiveUnitTime, getStandardTimeForCoil } from '../utils/calculations';

interface ResultPanelProps {
  summary: CalculationSummary;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ summary }) => {
  const {
    totalProducedTime,
    dailyCapacity,
    remainingTime,
    excessTime,
    isOverCapacity,
    efficiency,
    validItemsCount,
    totalQuantity,
    averageTimePerCoil,
    theoreticalCapacity,
    integerCapacity,
  } = summary;

  // Barra gráfica limitada a 100% para não estourar a largura visual
  const progressPercent = Math.min(100, Math.max(0, dailyCapacity > 0 ? (totalProducedTime / dailyCapacity) * 100 : 0));

  return (
    <section aria-label="Painel de Resultados de Produção" className="w-full mb-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs">
        
        {/* Painel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isOverCapacity ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider font-mono">
                PAINEL DE RESULTADOS
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Balanço de tempo e capacidade do turno
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span>Modelos válidos: <strong className="text-slate-900 font-bold">{validItemsCount}</strong></span>
            <span className="text-slate-300">•</span>
            <span>Total de bobinas: <strong className="text-slate-900 font-bold">{totalQuantity}</strong></span>
          </div>
        </div>

        {/* Primary Cards Grid (5 Indicadores Principais) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          
          {/* 1. TEMPO PRODUZIDO */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                TEMPO PRODUZIDO
              </span>
              <div className="p-1 rounded bg-blue-100 text-blue-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-700 font-mono tracking-tight">
                  {formatBrNumber(totalProducedTime, 2)}
                </span>
                <span className="text-sm font-bold text-slate-500 font-mono">
                  min
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Soma dos transformadores
              </p>
            </div>
          </div>

          {/* 2. TEMPO RESTANTE ou TEMPO EXCEDENTE */}
          {isOverCapacity ? (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-800 mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  TEMPO EXCEDENTE
                </span>
                <div className="p-1 rounded bg-rose-200 text-rose-800">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-rose-700 font-mono tracking-tight">
                    {formatBrNumber(excessTime, 2)}
                  </span>
                  <span className="text-sm font-bold text-rose-700/80 font-mono">
                    min
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 font-semibold mt-1 font-mono">
                  Acima da capacidade diária
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  TEMPO RESTANTE
                </span>
                <div className="p-1 rounded bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono tracking-tight">
                    {formatBrNumber(remainingTime, 2)}
                  </span>
                  <span className="text-sm font-bold text-slate-500 font-mono">
                    min
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Disponível até {dailyCapacity} min
                </p>
              </div>
            </div>
          )}

          {/* 3. EFICIÊNCIA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                EFICIÊNCIA
              </span>
              <div className={`p-1 rounded ${efficiency > 100 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                  isOverCapacity ? 'text-rose-700' : efficiency >= 100 ? 'text-emerald-700' : 'text-blue-700'
                }`}>
                  {formatEfficiency(efficiency)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Tempo produzido / Disponível
              </p>
            </div>
          </div>

          {/* 4. CAPACIDADE DIÁRIA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                CAPACIDADE DIÁRIA
              </span>
              <div className="p-1 rounded bg-slate-200 text-slate-700">
                <Gauge className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {dailyCapacity}
                </span>
                <span className="text-sm font-bold text-slate-500 font-mono">
                  min
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Jornada selecionada
              </p>
            </div>
          </div>

          {/* 5. TOTAL DE BOBINAS */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                TOTAL DE BOBINAS
              </span>
              <div className="p-1 rounded bg-blue-100 text-blue-700">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {totalQuantity}
                </span>
                <span className="text-sm font-bold text-slate-500 font-mono">
                  {totalQuantity === 1 ? 'bobina' : 'bobinas'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Soma total de quantidades
              </p>
            </div>
          </div>

        </div>

        {/* Secondary Metrics: Capacidade Teórica, Inteira e Tempo Médio */}
        {validItemsCount > 0 && theoreticalCapacity !== null && (
          <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 rounded-xl p-3.5 sm:p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-mono uppercase font-bold text-slate-800 tracking-wider">
                {validItemsCount === 1 ? 'Cálculo de Capacidade (Modelo Único)' : 'Cálculo de Capacidade Teórica Ponderada (Múltiplos Modelos)'}
              </span>
            </div>

            <div className={`grid grid-cols-1 ${validItemsCount >= 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 text-sm`}>
              
              {/* Quando houver 2 ou mais modelos: TEMPO MÉDIO POR BOBINA */}
              {validItemsCount >= 2 && averageTimePerCoil !== null && (
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-mono uppercase text-slate-500 block font-semibold mb-0.5">
                    TEMPO MÉDIO POR BOBINA
                  </span>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-lg font-bold text-blue-700">
                      {formatUnitTime(averageTimePerCoil)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 block mt-0.5">
                    Tempo total / Total de bobinas
                  </span>
                </div>
              )}

              {/* CAPACIDADE TEÓRICA */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] font-mono uppercase text-slate-500 block font-semibold mb-0.5">
                  CAPACIDADE TEÓRICA
                </span>
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-lg font-bold text-slate-900">
                    {formatBrNumber(theoreticalCapacity, 2)}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    bobinas
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 block mt-0.5">
                  Tempo disponível / Tempo unitário ou médio
                </span>
              </div>

              {/* CAPACIDADE INTEIRA */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] font-mono uppercase text-slate-500 block font-semibold mb-0.5">
                  CAPACIDADE INTEIRA
                </span>
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-lg font-extrabold text-emerald-700">
                    {integerCapacity}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    bobinas completas
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 block mt-0.5">
                  Arredondamento inteiro para baixo
                </span>
              </div>

            </div>
          </div>
        )}

        {/* Industrial Visual Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-mono text-slate-600 mb-1.5">
            <span>Tempo utilizado da jornada diária:</span>
            <span className="font-bold text-slate-900">
              {formatBrNumber(totalProducedTime, 2)} de {dailyCapacity} min ({formatEfficiency(efficiency)})
            </span>
          </div>
          
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div 
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isOverCapacity 
                  ? 'bg-rose-600' 
                  : efficiency >= 100 
                    ? 'bg-emerald-600' 
                    : 'bg-blue-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1.5">
            <span>0 min</span>
            <span>{Math.round(dailyCapacity / 2)} min</span>
            <span className="font-bold text-slate-700">{dailyCapacity} min</span>
          </div>
        </div>

        {/* Bloco BOBINAS POR UNIDADE conforme Requisitos 2 e 3 */}
        {summary.activeItems && summary.activeItems.some((item) => Boolean(item.usedTransformer || (item.selectedReferences && item.selectedReferences.length > 0))) && (
          <div className="mt-5 pt-5 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  BOBINAS POR UNIDADE
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Base de tempos dos modelos utilizados no cálculo ({summary.coilType})
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 self-start sm:self-auto font-semibold">
                Bobina Ativa: {summary.coilType}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-200 bg-slate-50/50">
              {summary.activeItems
                .filter((item) => Boolean(item.usedTransformer || (item.selectedReferences && item.selectedReferences.length > 0)))
                .map((item, idx) => {
                  const effectiveTime = getItemEffectiveUnitTime(item, summary.coilType);
                  const isExact = item.matchType === 'EXACT' && item.usedTransformer;
                  const hasSingleRef = item.selectedReferences && item.selectedReferences.length === 1;
                  const hasMultiRef = item.selectedReferences && item.selectedReferences.length > 1;

                  return (
                    <div key={item.id || idx} className="p-3 bg-white hover:bg-slate-50/80 transition-colors">
                      {/* Caso 1: Código Exato */}
                      {isExact && item.usedTransformer && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {item.usedTransformer.modelo}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                              {item.usedTransformer.linha}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-xs font-mono text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              {item.usedTransformer.classe || '15 KV'}
                            </span>
                            <span className="inline-flex items-center text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                              CÓDIGO ORIGINAL
                            </span>
                          </div>

                          <div className="text-right font-mono shrink-0">
                            <span className="text-sm font-extrabold text-blue-700">
                              {formatBrNumber(effectiveTime, { min: 2, max: 4 })} min/un
                            </span>
                            {typeof item.quantity === 'number' && item.quantity > 0 && (
                              <span className="text-[11px] text-slate-500 block">
                                Qtd: {item.quantity} un
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Caso 2: 1 Referência Utilizada */}
                      {hasSingleRef && item.selectedReferences && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-slate-900">
                                {item.searchedCode}
                              </span>
                              <span className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-bold uppercase">
                                REFERÊNCIA UTILIZADA
                              </span>
                            </div>
                            <div className="text-right font-mono shrink-0">
                              <span className="text-sm font-extrabold text-blue-700">
                                {formatBrNumber(effectiveTime, { min: 2, max: 4 })} min/un
                              </span>
                              {typeof item.quantity === 'number' && item.quantity > 0 && (
                                <span className="text-[11px] text-slate-500 block">
                                  Qtd: {item.quantity} un
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2 text-xs font-mono text-slate-700 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-slate-500 font-semibold">Código de referência:</span>
                              <strong className="text-slate-900">{item.selectedReferences[0].modelo}</strong>
                              <span className="text-slate-300">|</span>
                              <span className="text-blue-700 font-bold">{item.selectedReferences[0].linha}</span>
                              <span className="text-slate-300">|</span>
                              <span>{item.selectedReferences[0].classe || '15 KV'}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-900 font-bold">
                                {formatBrNumber(getStandardTimeForCoil(item.selectedReferences[0], summary.coilType), { min: 2, max: 4 })} min/un
                              </span>
                            </div>
                            <span className="text-[10px] text-amber-900 font-semibold bg-white px-2 py-0.5 rounded border border-amber-200">
                              Tempo utilizado: {formatBrNumber(effectiveTime, { min: 2, max: 4 })} min/un
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Caso 3: Média de 2 ou mais Referências */}
                      {hasMultiRef && item.selectedReferences && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-slate-900">
                                {item.searchedCode}
                              </span>
                              <span className="text-[11px] font-mono text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded font-bold uppercase">
                                MÉDIA UTILIZADA ({item.selectedReferences.length} REF)
                              </span>
                            </div>
                            <div className="text-right font-mono shrink-0">
                              <span className="text-sm font-extrabold text-blue-700">
                                {formatBrNumber(effectiveTime, { min: 2, max: 4 })} min/un
                              </span>
                              {typeof item.quantity === 'number' && item.quantity > 0 && (
                                <span className="text-[11px] text-slate-500 block">
                                  Qtd: {item.quantity} un
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-2.5 text-xs font-mono text-slate-700 space-y-1">
                            <div className="text-[11px] text-purple-900 font-bold uppercase">
                              Códigos de referência da média:
                            </div>
                            <div className="space-y-1 pl-1">
                              {item.selectedReferences.map((ref) => {
                                const refTime = getStandardTimeForCoil(ref, summary.coilType);
                                return (
                                  <div key={ref.modelo} className="flex items-center gap-2 flex-wrap text-slate-800">
                                    <span className="text-purple-600 font-bold">•</span>
                                    <strong className="text-slate-900">{ref.modelo}</strong>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-blue-700 font-semibold">{ref.linha}</span>
                                    <span className="text-slate-300">|</span>
                                    <span>{ref.classe || '15 KV'}</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="font-bold text-slate-900">{formatBrNumber(refTime, { min: 2, max: 4 })} min/un</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="pt-1.5 mt-1 border-t border-purple-200 flex items-center justify-between text-[11px]">
                              <span className="text-purple-900 font-bold">Média das referências:</span>
                              <strong className="text-blue-800 font-mono text-xs">
                                Tempo utilizado: {formatBrNumber(effectiveTime, { min: 2, max: 4 })} min/un
                              </strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Caso 4: Sem tempo disponível */}
                      {!isExact && !hasSingleRef && !hasMultiRef && (
                        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                          <span>{item.searchedCode || 'Transformador'}</span>
                          <span className="text-rose-600 font-semibold">Tempo não definido</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}


      </div>
    </section>
  );
};
