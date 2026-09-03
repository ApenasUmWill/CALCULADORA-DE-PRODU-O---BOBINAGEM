import React from 'react';
import { Plus, RotateCcw, Factory, Sparkles, AlertCircle } from 'lucide-react';
import { CoilType, ProductionItem, Transformador } from '../types';
import { APP_CONFIG } from '../config';
import { ProductionRow } from './ProductionRow';
import { ReferenceModalContext } from './ReferenceSelectionModal';

interface ProductionTableProps {
  items: ProductionItem[];
  globalCoilType: CoilType;
  availableTransformers: Transformador[];
  onAddItem: () => void;
  onUpdateItem: (index: number, item: ProductionItem) => void;
  onRemoveItem: (index: number) => void;
  onClearAll: () => void;
  onLoadTestExample: () => void;
  onRequestReferenceModal: (itemId: string, searchedCode: string, context: ReferenceModalContext) => void;
  autoFocusTarget?: { id: string; field: 'code' | 'quantity'; timestamp: number } | null;
}

export const ProductionTable: React.FC<ProductionTableProps> = ({
  items,
  globalCoilType,
  availableTransformers,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onClearAll,
  onLoadTestExample,
  onRequestReferenceModal,
  autoFocusTarget,
}) => {
  const isMaxReached = items.length >= APP_CONFIG.MAX_PRODUCTION_ITEMS;

  return (
    <section aria-label="Área de Produção" className="w-full space-y-4">
      
      {/* Section Header with Actions & Model Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-700">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-mono uppercase tracking-wider">
                PRODUÇÃO
              </h2>
              {/* Contador de Modelos: X de 10 */}
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                isMaxReached 
                  ? 'bg-amber-100 text-amber-900 border-amber-300' 
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {items.length} de {APP_CONFIG.MAX_PRODUCTION_ITEMS} modelos
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Transformadores e quantidades do cálculo atual
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          
          {/* Quick example loader */}
          <button
            type="button"
            id="btn-carregar-exemplo"
            onClick={onLoadTestExample}
            title="Preencher com exemplo de teste"
            className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-mono font-semibold border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden xs:inline">Carregar</span> Exemplo
          </button>

          {/* Limpar cálculo button */}
          <button
            type="button"
            id="btn-limpar-calculo"
            onClick={onClearAll}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 hover:border-rose-300 text-xs font-mono font-bold uppercase tracking-wider border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            LIMPAR CÁLCULO
          </button>

          {/* Adicionar produção button */}
          <button
            type="button"
            id="btn-adicionar-producao"
            disabled={isMaxReached}
            onClick={onAddItem}
            title={isMaxReached ? "Limite de 10 modelos atingido" : "Adicionar nova linha de transformador"}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-all flex items-center gap-1.5 ${
              isMaxReached
                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-98'
            }`}
          >
            <Plus className="w-4 h-4" />
            + ADICIONAR PRODUÇÃO
          </button>

        </div>
      </div>

      {/* Aviso de Limite Máximo atingido se 10 modelos */}
      {isMaxReached && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs font-mono text-amber-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            <strong>LIMITE ATINGIDO:</strong> O cálculo atingiu o limite máximo de 10 modelos por turno.
          </span>
        </div>
      )}

      {/* Production List Rows */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <ProductionRow
            key={item.id}
            item={item}
            index={index}
            globalCoilType={globalCoilType}
            availableTransformers={availableTransformers}
            onUpdate={(updated) => onUpdateItem(index, updated)}
            onRemove={() => onRemoveItem(index)}
            onRequestReferenceModal={onRequestReferenceModal}
            focusField={autoFocusTarget?.id === item.id ? autoFocusTarget.field : null}
            focusTimestamp={autoFocusTarget?.id === item.id ? autoFocusTarget.timestamp : undefined}
          />
        ))}
      </div>

      {/* Bottom add production button (only shown if not max reached) */}
      {!isMaxReached && items.length > 0 && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={onAddItem}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 text-slate-600 hover:text-blue-700 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            + ADICIONAR OUTRO TRANSFORMADOR ({items.length} de {APP_CONFIG.MAX_PRODUCTION_ITEMS})
          </button>
        </div>
      )}

    </section>
  );
};

