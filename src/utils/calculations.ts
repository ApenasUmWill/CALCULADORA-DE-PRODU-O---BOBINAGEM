import { APP_CONFIG } from '../config';
import { CalculationSummary, CoilType, ProductionItem, Transformador } from '../types';

/**
 * Obtém o tempo padrão de um transformador para o tipo de bobina selecionado (AT ou BT).
 * Retorna number apenas se for estritamente positivo (> 0) e válido.
 * Retorna null se não estiver cadastrado, for nulo, ausente ou igual a 0 / 0.000.
 */
export function getStandardTimeForCoil(
  transformer: Transformador | null,
  coilType: CoilType
): number | null {
  if (!transformer) return null;
  const time = coilType === 'AT' ? transformer.tempo_padrao_at : transformer.tempo_padrao_bt;
  if (typeof time === 'number' && !isNaN(time) && time > 0) {
    return time;
  }
  return null;
}

/**
 * Obtém o tempo unitário efetivo de um item de produção para a bobina ativa (AT ou BT).
 * - Se for código exato: retorna o tempo padrão do modelo (ou null se não cadastrado)
 * - Se for por referências (código não encontrado ou sem tempo):
 *   - 1 referência: retorna o tempo original dessa referência (sem média)
 *   - 2 ou mais referências: retorna a média aritmética simples dos tempos válidos
 */
export function getItemEffectiveUnitTime(
  item: ProductionItem,
  coilType: CoilType
): number | null {
  // Se for código exato confirmado
  if (item.matchType === 'EXACT' && item.usedTransformer) {
    return getStandardTimeForCoil(item.usedTransformer, coilType);
  }

  // Se houver referências selecionadas (código não encontrado ou sem tempo)
  if (item.selectedReferences && item.selectedReferences.length > 0) {
    const validTimes = item.selectedReferences
      .map((ref) => getStandardTimeForCoil(ref, coilType))
      .filter((t): t is number => typeof t === 'number' && !isNaN(t) && t > 0);

    if (validTimes.length === 0) return null;
    if (validTimes.length === 1) return validTimes[0];

    const sum = validTimes.reduce((acc, curr) => acc + curr, 0);
    return sum / validTimes.length;
  }

  // Se houver calculatedUnitTime salvo (fallback)
  if (item.calculatedUnitTime !== null && item.calculatedUnitTime !== undefined && typeof item.calculatedUnitTime === 'number' && item.calculatedUnitTime > 0) {
    return item.calculatedUnitTime;
  }

  // Fallback para usedTransformer se houver
  if (item.usedTransformer) {
    return getStandardTimeForCoil(item.usedTransformer, coilType);
  }

  return null;
}

/**
 * Calcula o tempo produzido para uma linha individual.
 * Retorna null se a quantidade for inválida ou se o tempo por unidade for null.
 */
export function calculateProductionTime(
  quantity: number | "",
  unitTime: number | null
): number | null {
  if (quantity === "" || typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
    return null;
  }
  if (unitTime === null || unitTime === undefined || typeof unitTime !== 'number' || isNaN(unitTime) || unitTime <= 0) {
    return null;
  }
  return quantity * unitTime;
}

/**
 * Calcula o resumo consolidado de toda a lista de produção com base no tipo global de bobina e jornada.
 */
export function calculateSummary(
  items: ProductionItem[],
  globalCoilType: CoilType = 'AT',
  dailyCapacity: number = APP_CONFIG.JORNADA_MINUTES.NORMAL
): CalculationSummary {
  let totalProducedTime = 0;
  let validItemsCount = 0;
  let totalQuantity = 0;
  let hasMissingTimeItems = false;
  let singleValidUnitTime: number | null = null;

  for (const item of items) {
    const hasIdentifier = Boolean(
      item.searchedCode || item.usedTransformer || (item.selectedReferences && item.selectedReferences.length > 0)
    );
    if (!hasIdentifier) continue;

    const unitTime = getItemEffectiveUnitTime(item, globalCoilType);
    if (unitTime === null || unitTime === undefined) {
      hasMissingTimeItems = true;
    }

    const lineTime = calculateProductionTime(item.quantity, unitTime);

    if (lineTime !== null && typeof item.quantity === 'number' && item.quantity > 0) {
      totalProducedTime += lineTime;
      validItemsCount += 1;
      totalQuantity += item.quantity;
      singleValidUnitTime = unitTime;
    }
  }

  const isOverCapacity = totalProducedTime > dailyCapacity;
  const remainingTime = isOverCapacity ? 0 : dailyCapacity - totalProducedTime;
  const excessTime = isOverCapacity ? totalProducedTime - dailyCapacity : 0;
  const efficiency = dailyCapacity > 0 ? (totalProducedTime / dailyCapacity) * 100 : 0;

  // Cálculo da Capacidade Teórica e Inteira
  let averageTimePerCoil: number | null = null;
  let theoreticalCapacity: number | null = null;
  let integerCapacity: number | null = null;

  if (validItemsCount === 1 && singleValidUnitTime !== null && singleValidUnitTime > 0) {
    averageTimePerCoil = singleValidUnitTime;
    theoreticalCapacity = dailyCapacity / singleValidUnitTime;
    integerCapacity = Math.floor(theoreticalCapacity);
  } else if (validItemsCount >= 2 && totalQuantity > 0 && totalProducedTime > 0) {
    // Tempo médio ponderado = tempo produzido total / quantidade total de bobinas
    averageTimePerCoil = totalProducedTime / totalQuantity;
    if (averageTimePerCoil > 0) {
      theoreticalCapacity = dailyCapacity / averageTimePerCoil;
      integerCapacity = Math.floor(theoreticalCapacity);
    }
  }

  return {
    totalProducedTime,
    dailyCapacity,
    remainingTime,
    excessTime,
    isOverCapacity,
    efficiency,
    validItemsCount,
    totalItemsCount: items.length,
    totalQuantity,
    averageTimePerCoil,
    theoreticalCapacity,
    integerCapacity,
    hasMissingTimeItems,
    activeItems: items,
    coilType: globalCoilType,
  };
}

/**
 * Formatação de números no padrão brasileiro com casas decimais configuráveis.
 * Permite especificar número fixo ou objeto com min e max { min?: number; max?: number }.
 */
export function formatBrNumber(
  value: number | null | undefined,
  decimals: number | { min?: number; max?: number } = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  const minDec = typeof decimals === 'number' ? decimals : (decimals.min ?? 2);
  const maxDec = typeof decimals === 'number' ? decimals : (decimals.max ?? 4);

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  }).format(value);
}

/**
 * Formatação de tempo em minutos (2 casas decimais)
 */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return '— min';
  }
  return `${formatBrNumber(minutes, 2)} min`;
}

/**
 * Formatação de tempo unitário por transformador (preserva até 4 casas decimais para tempos precisos)
 */
export function formatUnitTime(
  unitTime: number | null | undefined,
  maxDecimals: number = 4
): string {
  if (unitTime === null || unitTime === undefined || isNaN(unitTime)) {
    return 'Não cadastrado';
  }
  return `${formatBrNumber(unitTime, { min: 2, max: maxDecimals })} min/un`;
}

/**
 * Formatação de porcentagem de eficiência (2 casas decimais)
 */
export function formatEfficiency(efficiency: number | null | undefined): string {
  if (efficiency === null || efficiency === undefined || isNaN(efficiency)) {
    return '0,00%';
  }
  return `${formatBrNumber(efficiency, 2)}%`;
}
