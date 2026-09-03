/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { GlobalControls } from './components/GlobalControls';
import { ResultPanel } from './components/ResultPanel';
import { ProductionTable } from './components/ProductionTable';
import { ReferenceSelectionModal, ReferenceModalContext } from './components/ReferenceSelectionModal';
import { ClearConfirmModal } from './components/ClearConfirmModal';
import { AdminDatabaseView } from './components/AdminDatabaseView';
import { CoilType, JornadaType, ProductionItem, ReferenceCandidate, Transformador } from './types';
import { getTransformers, findExactMatch, findReferenceCandidates } from './services/transformerService';
import { calculateSummary, getStandardTimeForCoil } from './utils/calculations';
import { APP_CONFIG } from './config';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Helper para gerar IDs únicos para as linhas
function createEmptyRow(): ProductionItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    searchedCode: '',
    usedTransformer: null,
    isSimilarMatch: false,
    quantity: '',
  };
}

export default function App() {
  const [activeView, setActiveView] = useState<'calculator' | 'admin'>('calculator');
  const [transformers, setTransformers] = useState<Transformador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [productionItems, setProductionItems] = useState<ProductionItem[]>([createEmptyRow()]);
  
  // Seletores Globais de Produção
  const [jornada, setJornada] = useState<JornadaType>('NORMAL');
  const [coilType, setCoilType] = useState<CoilType>('AT');

  // Modal de Seleção de Referências
  const [referenceModalState, setReferenceModalState] = useState<{
    isOpen: boolean;
    targetItemId: string;
    searchedCode: string;
    context: ReferenceModalContext;
    candidates: ReferenceCandidate[];
  }>({
    isOpen: false,
    targetItemId: '',
    searchedCode: '',
    context: 'CODE_NOT_FOUND',
    candidates: [],
  });

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Alvo de foco automático para usabilidade móvel (nova linha ou confirmação de modal)
  const [autoFocusTarget, setAutoFocusTarget] = useState<{
    id: string;
    field: 'code' | 'quantity';
    timestamp: number;
  } | null>(null);

  // Carrega base de transformadores via serviço do Supabase
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getTransformers();
      setTransformers(data || []);
      console.log(`[Supabase] Conexão estabelecida com sucesso. Registros carregados: ${data ? data.length : 0}`);
    } catch (err: any) {
      console.error('[Supabase] Falha ao conectar com o Supabase:', err);
      setLoadError(err?.message || 'Não foi possível carregar a base de transformadores do Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Capacidade em minutos baseada na jornada selecionada (NORMAL = 424 min, REDUZIDO = 389 min)
  const dailyCapacity = useMemo(() => {
    return jornada === 'NORMAL'
      ? APP_CONFIG.JORNADA_MINUTES.NORMAL
      : APP_CONFIG.JORNADA_MINUTES.REDUZIDO;
  }, [jornada]);

  // Cálculo consolidado reativo instantâneo
  const summary = useMemo(() => {
    return calculateSummary(productionItems, coilType, dailyCapacity);
  }, [productionItems, coilType, dailyCapacity]);

  // Manipulação de Linhas de Produção
  const handleAddItem = () => {
    if (productionItems.length >= APP_CONFIG.MAX_PRODUCTION_ITEMS) {
      return;
    }
    const newRow = createEmptyRow();
    setProductionItems((prev) => [...prev, newRow]);
    setAutoFocusTarget({
      id: newRow.id,
      field: 'code',
      timestamp: Date.now(),
    });
  };

  const handleUpdateItem = (index: number, updatedItem: ProductionItem) => {
    setProductionItems((prev) => {
      const copy = [...prev];
      copy[index] = updatedItem;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setProductionItems((prev) => {
      const copy = prev.filter((_, i) => i !== index);
      // Se remover todas as linhas, mantém pelo menos uma linha vazia para preenchimento
      return copy.length === 0 ? [createEmptyRow()] : copy;
    });
  };

  // Limpeza com verificação de confirmação
  const handleRequestClear = () => {
    const hasData = productionItems.some(
      (item) => item.searchedCode.trim() !== '' || item.quantity !== '' || item.usedTransformer !== null
    );

    if (hasData) {
      setIsClearModalOpen(true);
    } else {
      setProductionItems([createEmptyRow()]);
    }
  };

  const handleConfirmClear = () => {
    setProductionItems([createEmptyRow()]);
    setIsClearModalOpen(false);
  };

  // Carregar cenário de teste usando modelos reais carregados do Supabase
  const handleLoadTestScenario = () => {
    if (transformers.length === 0) return;

    const t1 = transformers[0];
    const t2 = transformers.length > 1 ? transformers[1] : transformers[0];

    const testItems: ProductionItem[] = [
      {
        id: `item-test-1-${Date.now()}`,
        searchedCode: t1.modelo,
        usedTransformer: t1,
        matchType: 'EXACT',
        calculatedUnitTime: getStandardTimeForCoil(t1, coilType),
        isSimilarMatch: false,
        quantity: 10,
      },
    ];

    if (transformers.length > 1) {
      testItems.push({
        id: `item-test-2-${Date.now()}`,
        searchedCode: t2.modelo,
        usedTransformer: t2,
        matchType: 'EXACT',
        calculatedUnitTime: getStandardTimeForCoil(t2, coilType),
        isSimilarMatch: false,
        quantity: 10,
      });
    }

    setProductionItems(testItems);
  };

  // Abertura do Modal de Seleção de Referências
  const handleOpenReferenceModal = (
    itemId: string,
    searchedCode: string,
    context: ReferenceModalContext
  ) => {
    // 1. Desfoca o elemento ativo imediatamente para fechar o teclado virtual no mobile
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const excludeModel = context === 'MISSING_TIME' ? searchedCode : undefined;
    const candidates = findReferenceCandidates(searchedCode, transformers, coilType, excludeModel);

    // 2. Aguarda um pequeno ciclo (requestAnimationFrame + delay curto) para que o teclado virtual
    // mobile termine de recolher e a viewport útil se ajuste completamente antes de renderizar o modal
    requestAnimationFrame(() => {
      setTimeout(() => {
        setReferenceModalState({
          isOpen: true,
          targetItemId: itemId,
          searchedCode,
          context,
          candidates,
        });
      }, 50);
    });
  };

  // Confirmação de seleção de referências
  const handleConfirmReferences = (selected: Transformador[], calculatedTime: number) => {
    if (!referenceModalState.targetItemId || selected.length === 0) return;

    const { targetItemId, searchedCode, context } = referenceModalState;

    const matchType = context === 'CODE_NOT_FOUND' ? 'NOT_FOUND_REFERENCES' : 'MISSING_TIME_REFERENCES';

    setProductionItems((prev) =>
      prev.map((item) => {
        if (item.id === targetItemId) {
          return {
            ...item,
            searchedCode,
            usedTransformer: selected[0],
            selectedReferences: selected,
            matchType,
            calculatedUnitTime: calculatedTime,
            isSimilarMatch: selected.length === 1,
            similarityScore: 0.9,
          };
        }
        return item;
      })
    );

    // Foca automaticamente o campo de quantidade da linha configurada
    setAutoFocusTarget({
      id: targetItemId,
      field: 'quantity',
      timestamp: Date.now(),
    });

    setReferenceModalState({
      isOpen: false,
      targetItemId: '',
      searchedCode: '',
      context: 'CODE_NOT_FOUND',
      candidates: [],
    });
  };

  const handleCancelReferenceModal = () => {
    setReferenceModalState({
      isOpen: false,
      targetItemId: '',
      searchedCode: '',
      context: 'CODE_NOT_FOUND',
      candidates: [],
    });
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-['Inter',sans-serif]">
      
      {/* Header com Logo Oficial ITAM, Capacidade Diária Dinâmica e Botão Administrar Base */}
      <Header
        dailyCapacity={dailyCapacity}
        jornada={jornada}
        activeView={activeView}
        onToggleView={(view) => setActiveView(view)}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        
        {/* Visualização da Área Administrativa: Atualizar Base de Modelos */}
        {activeView === 'admin' ? (
          <AdminDatabaseView
            onBackToCalculator={() => setActiveView('calculator')}
            onDatabaseUpdated={loadData}
          />
        ) : (
          <>
            {/* Banner de erro ou alerta de conexão Supabase */}
            {loadError && (
              <div
                id="supabase-error-banner"
                className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wide">
                      Falha na Conexão com o Supabase
                    </p>
                    <p className="text-xs text-rose-700 mt-0.5">{loadError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-rose-100/50 text-rose-800 text-xs font-mono font-bold border border-rose-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Conectando...' : 'Tentar Novamente'}
                </button>
              </div>
            )}

            {/* Bloco 1: Jornada de Trabalho & Bloco 2: Tipo de Bobina (GlobalControls) */}
            <GlobalControls
              jornada={jornada}
              onJornadaChange={setJornada}
              coilType={coilType}
              onCoilTypeChange={setCoilType}
              dailyCapacity={dailyCapacity}
            />

            {/* Bloco 3: Produção (Lista Dinâmica de Linhas até 10 modelos) */}
            <ProductionTable
              items={productionItems}
              globalCoilType={coilType}
              availableTransformers={transformers}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
              onClearAll={handleRequestClear}
              onLoadTestExample={handleLoadTestScenario}
              onRequestReferenceModal={handleOpenReferenceModal}
              autoFocusTarget={autoFocusTarget}
            />

            {/* Bloco 4: Painel de Resultados (Posicionado abaixo da Produção) */}
            <ResultPanel summary={summary} />
          </>
        )}

      </main>


      {/* Footer corporativo com informações industriais */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-600">ITAM Transformadores • Setor de Bobinagem</span>
          <span>Jornada: {jornada} ({dailyCapacity} min) • Bobina Global: {coilType}</span>
        </div>
      </footer>

      {/* Modal de Seleção de Referências (Vizinhos e Família com Média Aritmética) */}
      <ReferenceSelectionModal
        isOpen={referenceModalState.isOpen}
        searchedCode={referenceModalState.searchedCode}
        context={referenceModalState.context}
        coilType={coilType}
        candidates={referenceModalState.candidates}
        onConfirm={handleConfirmReferences}
        onCancel={handleCancelReferenceModal}
      />

      {/* Modal de Confirmação para Limpar Cálculo */}
      <ClearConfirmModal
        isOpen={isClearModalOpen}
        onConfirm={handleConfirmClear}
        onCancel={() => setIsClearModalOpen(false)}
      />

    </div>
  );
}

