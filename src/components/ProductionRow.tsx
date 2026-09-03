import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Search, AlertCircle, AlertTriangle, ShieldCheck, Layers, HelpCircle } from 'lucide-react';
import { CoilType, ProductionItem, Transformador } from '../types';
import { normalizeCode, findExactMatch, fetchExactTransformerFromSupabase, getAutocompleteSuggestions } from '../services/transformerService';
import { getStandardTimeForCoil, getItemEffectiveUnitTime, calculateProductionTime, formatBrNumber, formatUnitTime } from '../utils/calculations';
import { ReferenceModalContext } from './ReferenceSelectionModal';

interface ProductionRowProps {
  item: ProductionItem;
  index: number;
  globalCoilType: CoilType;
  availableTransformers: Transformador[];
  onUpdate: (updatedItem: ProductionItem) => void;
  onRemove: () => void;
  onRequestReferenceModal: (itemId: string, searchedCode: string, context: ReferenceModalContext) => void;
  focusField?: 'code' | 'quantity' | null;
  focusTimestamp?: number;
}

export const ProductionRow: React.FC<ProductionRowProps> = ({
  item,
  index,
  globalCoilType,
  availableTransformers,
  onUpdate,
  onRemove,
  onRequestReferenceModal,
  focusField,
  focusTimestamp,
}) => {
  const [inputValue, setInputValue] = useState(item.searchedCode || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [inputError, setInputError] = useState<string | null>(null);
  const rowContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Sincroniza estado de input se searchedCode for atualizado externamente
  useEffect(() => {
    setInputValue(item.searchedCode);
  }, [item.searchedCode]);

  // Posiciona suavemente o campo de código na parte superior útil da viewport no mobile (< 768px)
  const scrollCodeInputToTopMobile = () => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;

    // Aguarda a abertura e ajuste do teclado virtual no mobile (~250ms)
    setTimeout(() => {
      const el = searchContainerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const currentScrollY = window.scrollY || window.pageYOffset;
      const viewportOffset = window.visualViewport ? window.visualViewport.offsetTop : 0;
      // Margem superior confortável (20px) para não colar no topo
      const TOP_MARGIN = 20;
      const targetScrollY = Math.max(0, Math.round(currentScrollY + rect.top - TOP_MARGIN - viewportOffset));

      // Executa rolagem se houver diferença perceptível (> 6px)
      if (Math.abs(rect.top - TOP_MARGIN) > 6) {
        window.scrollTo({
          top: targetScrollY,
          behavior: 'smooth',
        });
      }
    }, 250);
  };

  // Foco automático e scroll quando solicitado por prop
  useEffect(() => {
    if (!focusField || !focusTimestamp) return;

    const timer = setTimeout(() => {
      if (focusField === 'code') {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          scrollCodeInputToTopMobile();
        } else {
          rowContainerRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
        codeInputRef.current?.focus();
      } else if (focusField === 'quantity') {
        rowContainerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [focusField, focusTimestamp]);

  // Função auxiliar para focar o campo quantidade
  const focusQuantityInput = () => {
    setTimeout(() => {
      if (quantityInputRef.current) {
        quantityInputRef.current.focus();
        quantityInputRef.current.select();
      }
    }, 60);
  };

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = getAutocompleteSuggestions(inputValue, availableTransformers, 8);
  const isDropdownOpen = showSuggestions && suggestions.length > 0;
  const currentUnitTime = getItemEffectiveUnitTime(item, globalCoilType);
  const producedTime = calculateProductionTime(item.quantity, currentUnitTime);

  // Reinicia o índice de seleção quando o texto digitado ou o estado de exibição mudar
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [inputValue, showSuggestions]);

  // Garante que o item destacado pelo teclado fique sempre visível (scrollIntoView)
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [highlightedIndex]);

  // Auxiliar para acionar o modal de referências garantindo o fechamento imediato do teclado virtual no mobile
  const triggerReferenceModal = (itemId: string, searchedCode: string, context: ReferenceModalContext) => {
    if (codeInputRef.current) {
      codeInputRef.current.blur();
    }
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onRequestReferenceModal(itemId, searchedCode, context);
  };

  // Executa busca de código
  const handlePerformSearch = async (codeToSearch: string) => {
    const normalized = normalizeCode(codeToSearch);
    if (!normalized) {
      setInputError('Digite o código do transformador.');
      return;
    }

    setInputError(null);
    setShowSuggestions(false);

    // 1. Tenta correspondência exata nos transformadores disponíveis
    let exact = findExactMatch(normalized, availableTransformers);

    // Se não encontrou no conjunto carregado, faz consulta direta no Supabase
    if (!exact) {
      exact = await fetchExactTransformerFromSupabase(normalized);
    }

    if (exact) {
      const time = getStandardTimeForCoil(exact, globalCoilType);
      if (time !== null && time !== undefined && time > 0) {
        // Situação 1: Código exato com tempo existente
        onUpdate({
          ...item,
          searchedCode: exact.modelo,
          usedTransformer: exact,
          matchType: 'EXACT',
          selectedReferences: undefined,
          calculatedUnitTime: time,
          isSimilarMatch: false,
          similarityScore: 1.0,
        });
        focusQuantityInput();
      } else {
        // Situação 2: Código existe, mas NÃO possui tempo cadastrado para o coilType selecionado (null ou <= 0)
        triggerReferenceModal(item.id, exact.modelo, 'MISSING_TIME');
      }
      return;
    }

    // 2. Situação 3: Código NÃO consta na base de dados
    triggerReferenceModal(item.id, normalized, 'CODE_NOT_FOUND');
  };

  const handleSelectAutocomplete = (t: Transformador) => {
    setInputValue(t.modelo);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setInputError(null);

    const time = getStandardTimeForCoil(t, globalCoilType);
    if (time !== null && time !== undefined && time > 0) {
      onUpdate({
        ...item,
        searchedCode: t.modelo,
        usedTransformer: t,
        matchType: 'EXACT',
        selectedReferences: undefined,
        calculatedUnitTime: time,
        isSimilarMatch: false,
        similarityScore: 1.0,
      });
      focusQuantityInput();
    } else {
      // Tempo não cadastrado para a bobina selecionada -> fluxo de referências da família
      triggerReferenceModal(item.id, t.modelo, 'MISSING_TIME');
    }
  };

  const handleQuantityChange = (val: string) => {
    if (val === '') {
      onUpdate({
        ...item,
        quantity: '',
      });
      return;
    }

    const parsed = Number(val);
    if (isNaN(parsed) || parsed < 0) {
      return;
    }

    onUpdate({
      ...item,
      quantity: parsed,
    });
  };

  const hasIdentifier = Boolean(item.searchedCode || item.usedTransformer || (item.selectedReferences && item.selectedReferences.length > 0));
  const hasMissingStandardTime = hasIdentifier && currentUnitTime === null;

  // Determinação da Linha e Classe para exibição
  const displayLine = item.usedTransformer?.linha || item.selectedReferences?.[0]?.linha || null;
  const displayClass = item.usedTransformer?.classe || item.selectedReferences?.[0]?.classe || '15 KV';
  const listboxId = `suggestions-listbox-${item.id}`;

  return (
    <div
      ref={rowContainerRef}
      className={`bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all ${isDropdownOpen ? 'relative z-30' : 'relative z-0'}`}
    >
      
      {/* Cabeçalho do Item */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-mono font-bold text-blue-700">
            #{index + 1}
          </span>
          <span className="text-xs font-mono text-slate-500 font-semibold uppercase tracking-wider">
            Transformador de Produção
          </span>
        </div>

        {/* Status indicator on top right */}
        <div className="flex items-center gap-2">
          {item.matchType === 'EXACT' && item.usedTransformer ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Código Exato
            </span>
          ) : item.selectedReferences && item.selectedReferences.length > 1 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              Média de Referências ({item.selectedReferences.length})
            </span>
          ) : item.selectedReferences && item.selectedReferences.length === 1 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Referência Utilizada
            </span>
          ) : hasIdentifier ? (
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {item.searchedCode ? `Buscando ${item.searchedCode}` : 'Identificado'}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Pendente de busca
            </span>
          )}

          {/* Remove Button */}
          <button
            type="button"
            onClick={onRemove}
            title="Remover este modelo"
            aria-label={`Remover modelo ${index + 1}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Form Fields Grid (CÓDIGO • LINHA/CLASSE • QUANTIDADE • TEMPO PRODUZIDO) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-start">
        
        {/* Col 1: Search & Model Input (md: col-span-5) */}
        <div className="md:col-span-5 space-y-1.5" ref={searchContainerRef}>
          <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">
            CÓDIGO DO TRANSFORMADOR <span className="text-blue-600">*</span>
          </label>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isDropdownOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                handleSelectAutocomplete(suggestions[highlightedIndex]);
              } else {
                handlePerformSearch(inputValue);
              }
            }}
            className="relative"
          >
            <input
              ref={codeInputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isDropdownOpen}
              aria-controls={isDropdownOpen ? listboxId : undefined}
              aria-activedescendant={
                isDropdownOpen && highlightedIndex >= 0
                  ? `${listboxId}-option-${highlightedIndex}`
                  : undefined
              }
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setInputValue(val);
                setShowSuggestions(true);
                setHighlightedIndex(-1);
                setInputError(null);
              }}
              onFocus={() => {
                if (inputValue.trim()) setShowSuggestions(true);
                scrollCodeInputToTopMobile();
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (!showSuggestions && suggestions.length > 0) {
                    setShowSuggestions(true);
                    setHighlightedIndex(0);
                    return;
                  }
                  if (isDropdownOpen) {
                    setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (isDropdownOpen) {
                    setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
                  }
                } else if (e.key === 'Enter' || e.keyCode === 13) {
                  e.preventDefault();
                  if (isDropdownOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    handleSelectAutocomplete(suggestions[highlightedIndex]);
                  } else {
                    handlePerformSearch(inputValue);
                  }
                } else if (e.key === 'Escape') {
                  if (isDropdownOpen || showSuggestions) {
                    e.preventDefault();
                    setShowSuggestions(false);
                    setHighlightedIndex(-1);
                  }
                }
              }}
              enterKeyHint="search"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Ex: DMC522008"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 sm:py-2 pr-10 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 uppercase font-semibold transition-all"
            />

            <button
              type="submit"
              title="Pesquisar código"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2 sm:p-1.5 rounded-md bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Autocomplete Dropdown */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 max-h-60 sm:max-h-64 overflow-y-auto overscroll-contain">
                <div className="py-1.5 px-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50 sticky top-0 z-10 select-none">
                  MODELOS SUGERIDOS
                </div>
                <div
                  id={listboxId}
                  role="listbox"
                  aria-label="Modelos sugeridos"
                  className="divide-y divide-slate-100"
                >
                  {suggestions.map((s, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    const time = getStandardTimeForCoil(s, globalCoilType);
                    const hasValidTime = time !== null && time > 0;

                    return (
                      <button
                        key={s.id || s.modelo}
                        ref={(el) => {
                          itemRefs.current[idx] = el;
                        }}
                        id={`${listboxId}-option-${idx}`}
                        role="option"
                        aria-selected={isHighlighted}
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectAutocomplete(s);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSelectAutocomplete(s);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 sm:py-2 min-h-[48px] sm:min-h-[42px] flex flex-col justify-center text-xs font-mono transition-colors cursor-pointer group ${
                          isHighlighted
                            ? 'bg-blue-100 text-blue-950 font-semibold border-l-4 border-blue-600 pl-2.5 shadow-2xs'
                            : 'hover:bg-blue-50/70 active:bg-blue-100 text-slate-800'
                        }`}
                      >
                        {/* Linha 1: Código e Linha • Classe */}
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span
                            className={`text-xs sm:text-xs font-bold tracking-tight ${
                              isHighlighted ? 'text-blue-950' : 'text-blue-700 group-hover:text-blue-800'
                            }`}
                          >
                            {s.modelo}
                          </span>
                          <span
                            className={`text-[11px] font-medium shrink-0 ml-2 ${
                              isHighlighted ? 'text-blue-900' : 'text-slate-500'
                            }`}
                          >
                            {s.linha} • {s.classe || '15 KV'}
                          </span>
                        </div>

                        {/* Linha 2: Status do tempo na bobina global selecionada (AT ou BT) */}
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono leading-tight">
                          {hasValidTime ? (
                            <span
                              className={`inline-flex items-center gap-1.5 font-semibold ${
                                isHighlighted ? 'text-blue-900' : 'text-emerald-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isHighlighted ? 'bg-blue-600' : 'bg-emerald-500'
                                }`}
                              />
                              <span>
                                {globalCoilType} • {formatUnitTime(time)}
                              </span>
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 font-medium ${
                                isHighlighted ? 'text-amber-950' : 'text-amber-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isHighlighted ? 'bg-amber-600' : 'bg-amber-500'
                                }`}
                              />
                              <span>{globalCoilType} • Sem tempo cadastrado</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </form>

          {inputError && (
            <p className="text-[11px] font-mono text-rose-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {inputError}
            </p>
          )}

          {/* Model info tags / Origin Transparency Details */}
          {item.matchType === 'EXACT' && item.usedTransformer && (
            <div className="pt-1 text-xs font-mono text-slate-600 space-y-0.5">
              <div>Código confirmado: <strong className="text-slate-900 font-bold">{item.usedTransformer.modelo}</strong></div>
              <div className="text-[11px] text-emerald-700 font-semibold">Origem do tempo: Tempo original ({formatUnitTime(currentUnitTime)})</div>
            </div>
          )}

          {item.matchType === 'NOT_FOUND_REFERENCES' && item.selectedReferences && item.selectedReferences.length === 1 && (
            <div className="pt-1 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs font-mono text-amber-950 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Código pesquisado:</span>
                <span className="font-bold text-slate-800">{item.searchedCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Referência utilizada:</span>
                <span className="font-bold text-blue-700">{item.selectedReferences[0].modelo}</span>
              </div>
              <div className="flex items-center justify-between text-amber-900">
                <span className="text-slate-600 font-semibold">Origem do tempo:</span>
                <span className="font-semibold">Referência semelhante</span>
              </div>
              <div className="text-[11px] text-amber-900 font-bold uppercase flex items-center justify-between pt-1 border-t border-amber-200">
                <span>Tempo utilizado:</span>
                <span className="text-blue-800 text-xs">{formatBrNumber(currentUnitTime, { min: 2, max: 4 })} min/un</span>
              </div>
            </div>
          )}

          {item.matchType === 'NOT_FOUND_REFERENCES' && item.selectedReferences && item.selectedReferences.length > 1 && (
            <div className="pt-1 bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-xs font-mono text-purple-950 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Código pesquisado:</span>
                <span className="font-bold text-slate-800">{item.searchedCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Referências utilizadas:</span>
                <span className="font-bold text-purple-900">{item.selectedReferences.map((r) => r.modelo).join(' + ')}</span>
              </div>
              <div className="flex items-center justify-between text-purple-900">
                <span className="text-slate-600 font-semibold">Origem do tempo:</span>
                <span className="font-semibold">Média de referências</span>
              </div>
              <div className="text-[11px] text-purple-900 font-bold uppercase flex items-center justify-between pt-1 border-t border-purple-200">
                <span>Tempo utilizado:</span>
                <span className="text-purple-900 text-xs">{formatBrNumber(currentUnitTime, { min: 2, max: 4 })} min/un</span>
              </div>
            </div>
          )}

          {item.matchType === 'MISSING_TIME_REFERENCES' && item.selectedReferences && item.selectedReferences.length === 1 && (
            <div className="pt-1 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs font-mono text-amber-950 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Código pesquisado:</span>
                <span className="font-bold text-slate-800">{item.searchedCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Referência para {globalCoilType}:</span>
                <span className="font-bold text-blue-700">{item.selectedReferences[0].modelo}</span>
              </div>
              <div className="flex items-center justify-between text-amber-900">
                <span className="text-slate-600 font-semibold">Origem do tempo:</span>
                <span className="font-semibold">Referência semelhante</span>
              </div>
              <div className="text-[11px] text-amber-900 font-bold uppercase flex items-center justify-between pt-1 border-t border-amber-200">
                <span>Tempo utilizado:</span>
                <span className="text-blue-800 text-xs">{formatBrNumber(currentUnitTime, { min: 2, max: 4 })} min/un</span>
              </div>
            </div>
          )}

          {item.matchType === 'MISSING_TIME_REFERENCES' && item.selectedReferences && item.selectedReferences.length > 1 && (
            <div className="pt-1 bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-xs font-mono text-purple-950 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Código pesquisado:</span>
                <span className="font-bold text-slate-800">{item.searchedCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Referências ({item.selectedReferences.length}):</span>
                <span className="font-bold text-purple-900">{item.selectedReferences.map((r) => r.modelo).join(' + ')}</span>
              </div>
              <div className="flex items-center justify-between text-purple-900">
                <span className="text-slate-600 font-semibold">Origem do tempo:</span>
                <span className="font-semibold">Média de referências para {globalCoilType}</span>
              </div>
              <div className="text-[11px] text-purple-900 font-bold uppercase flex items-center justify-between pt-1 border-t border-purple-200">
                <span>Tempo utilizado:</span>
                <span className="text-purple-900 text-xs">{formatBrNumber(currentUnitTime, { min: 2, max: 4 })} min/un</span>
              </div>
            </div>
          )}
        </div>

        {/* Col 2: LINHA & CLASSE (md: col-span-3) — preenchimento automático */}
        <div className="md:col-span-3 space-y-1.5">
          <label className="block text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
            LINHA & CLASSE
          </label>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-center min-h-[42px]">
            {displayLine ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  {displayLine}
                </span>
                <span className="text-xs font-mono text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded font-semibold">
                  {displayClass}
                </span>
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-400 italic">Automático após busca</span>
            )}
          </div>
        </div>

        {/* Col 3: QUANTIDADE (md: col-span-2) */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">
            QUANTIDADE <span className="text-blue-600">*</span>
          </label>
          <input
            ref={quantityInputRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            min="1"
            step="1"
            value={item.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Ex: 10"
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 text-center placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
          {typeof item.quantity === 'number' && item.quantity <= 0 && (
            <span className="text-[10px] font-mono text-rose-600 block text-center font-semibold">
              Deve ser &gt; 0
            </span>
          )}
        </div>

        {/* Col 4: TEMPO PRODUZIDO (md: col-span-2) */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider text-right">
            TEMPO PRODUZIDO
          </label>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-center min-h-[42px] text-right">
            {hasMissingStandardTime ? (
              <span className="text-[11px] font-mono text-rose-600 font-bold">
                ⚠️ Tempo Nulo
              </span>
            ) : producedTime !== null ? (
              <>
                <span className="text-sm sm:text-base font-mono font-extrabold text-blue-700">
                  {formatBrNumber(producedTime, 2)} min
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-semibold">
                  {formatUnitTime(currentUnitTime)}
                </span>
              </>
            ) : currentUnitTime !== null ? (
              <span className="text-[11px] font-mono text-slate-500">
                {formatUnitTime(currentUnitTime)}
              </span>
            ) : (
              <span className="text-xs font-mono text-slate-400">—</span>
            )}
          </div>
        </div>

      </div>

      {/* Aviso se faltar tempo padrão */}
      {hasMissingStandardTime && (
        <div className="mt-3.5 bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs font-mono text-rose-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>
              <strong>Código encontrado — tempo não cadastrado:</strong> O tempo <strong>{globalCoilType}</strong> deste modelo não possui valor válido cadastrado.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRequestReferenceModal(item.id, item.searchedCode || item.usedTransformer?.modelo || '', 'MISSING_TIME')}
            className="px-2.5 py-1 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 rounded font-mono text-[11px] font-bold cursor-pointer shrink-0"
          >
            Escolher Referências
          </button>
        </div>
      )}

    </div>
  );
};

