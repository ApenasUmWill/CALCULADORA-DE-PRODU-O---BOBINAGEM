import { APP_CONFIG } from '../config';
import { CoilType, MatchedCandidate, ReferenceCandidate, Transformador } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Consulta a tabela public.transformadores no Supabase trazendo apenas registros com ativo = true.
 */
export async function getTransformers(): Promise<Transformador[]> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error(
      'Credenciais do Supabase (SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY) não configuradas no ambiente.'
    );
  }

  const { data, error } = await supabase
    .from('transformadores')
    .select('*')
    .eq('ativo', true)
    .order('modelo', { ascending: true });

  if (error) {
    console.error('Erro ao consultar tabela public.transformadores:', error);
    throw new Error(`Não foi possível carregar a base de transformadores do Supabase: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data as Transformador[];
}

/**
 * Busca direta no Supabase por correspondência exata do modelo (case-insensitive)
 */
export async function fetchExactTransformerFromSupabase(code: string): Promise<Transformador | null> {
  const normalized = normalizeCode(code);
  if (!normalized || !supabase || !isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('transformadores')
      .select('*')
      .eq('ativo', true)
      .ilike('modelo', normalized)
      .limit(1);

    if (!error && data && data.length > 0) {
      return data[0] as Transformador;
    }
  } catch (err) {
    console.warn('Erro na consulta direta ao Supabase:', err);
  }
  return null;
}

/**
 * Normaliza o código digitado pelo usuário:
 * - Remove espaços extras
 * - Converte para letras maiúsculas
 * - Remove caracteres invisíveis
 */
export function normalizeCode(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase().replace(/[\s\-_]+/g, '');
}

/**
 * Estrutura decomposta de um código de transformador (ex: DMC522008, DTE522018X)
 */
export interface CodeStructure {
  raw: string;
  prefix: string; // Ex: DMC, DTE
  familyDigits: string; // Ex: 5220
  familyCode: string; // Ex: DMC5220, DTE5220
  sequence: number | null; // Ex: 8, 18
  suffix: string; // Ex: "X"
  strippedCode: string; // Ex: "DTE522018"
}

/**
 * Decompõe um código nas suas partes estruturais com suporte a sufixos e variações
 */
export function parseTransformerCode(code: string): CodeStructure {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return {
      raw: '',
      prefix: '',
      familyDigits: '',
      familyCode: '',
      sequence: null,
      suffix: '',
      strippedCode: '',
    };
  }
  
  // 1. Padrão oficial padrão: 2 a 4 letras + 4 dígitos de família + 1 a 3 dígitos de sequência + sufixo opcional (ex: DTE522018X)
  const matchStandard = normalized.match(/^([A-Z]{2,4})(\d{4})(\d{1,3})([A-Z0-9]*)$/);
  if (matchStandard) {
    const prefix = matchStandard[1];
    const familyDigits = matchStandard[2];
    const sequenceNum = parseInt(matchStandard[3], 10);
    const suffix = matchStandard[4] || '';
    const seqStr = matchStandard[3];
    return {
      raw: normalized,
      prefix,
      familyDigits,
      familyCode: `${prefix}${familyDigits}`,
      sequence: isNaN(sequenceNum) ? null : sequenceNum,
      suffix,
      strippedCode: `${prefix}${familyDigits}${seqStr}`,
    };
  }

  // 2. Padrão família apenas (ex: DTE5220)
  const matchFamilyOnly = normalized.match(/^([A-Z]{2,4})(\d{4})$/);
  if (matchFamilyOnly) {
    const prefix = matchFamilyOnly[1];
    const familyDigits = matchFamilyOnly[2];
    return {
      raw: normalized,
      prefix,
      familyDigits,
      familyCode: `${prefix}${familyDigits}`,
      sequence: null,
      suffix: '',
      strippedCode: `${prefix}${familyDigits}`,
    };
  }

  // 3. Padrão genérico de tamanho de família variável (3 a 5 dígitos) + sequência de 2 dígitos + sufixo
  const matchGenericVar = normalized.match(/^([A-Z]{2,4})(\d{3,5})(\d{2})([A-Z0-9]*)$/);
  if (matchGenericVar) {
    const prefix = matchGenericVar[1];
    const familyDigits = matchGenericVar[2];
    const sequenceNum = parseInt(matchGenericVar[3], 10);
    const suffix = matchGenericVar[4] || '';
    const seqStr = matchGenericVar[3];
    return {
      raw: normalized,
      prefix,
      familyDigits,
      familyCode: `${prefix}${familyDigits}`,
      sequence: isNaN(sequenceNum) ? null : sequenceNum,
      suffix,
      strippedCode: `${prefix}${familyDigits}${seqStr}`,
    };
  }

  // 4. Divisão genérica Letras + Números
  const matchGeneric = normalized.match(/^([A-Z]+)(\d+)([A-Z0-9]*)$/);
  if (matchGeneric) {
    const prefix = matchGeneric[1];
    const numPart = matchGeneric[2];
    const suffix = matchGeneric[3] || '';
    const familyDigits = numPart.length > 2 ? numPart.slice(0, numPart.length - 2) : numPart;
    const seqPart = numPart.length > 2 ? numPart.slice(-2) : numPart;
    const seq = parseInt(seqPart, 10);

    return {
      raw: normalized,
      prefix,
      familyDigits,
      familyCode: `${prefix}${familyDigits}`,
      sequence: isNaN(seq) ? null : seq,
      suffix,
      strippedCode: `${prefix}${numPart}`,
    };
  }

  const prefixOnly = normalized.replace(/[^A-Z]/g, '');
  const digitsOnly = normalized.replace(/[^0-9]/g, '');
  return {
    raw: normalized,
    prefix: prefixOnly,
    familyDigits: digitsOnly,
    familyCode: normalized,
    sequence: null,
    suffix: '',
    strippedCode: normalized,
  };
}

/**
 * Calcula a Distância de Levenshtein entre duas strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Busca por correspondência exata
 */
export function findExactMatch(inputCode: string, transformers: Transformador[]): Transformador | null {
  const normalizedInput = normalizeCode(inputCode);
  if (!normalizedInput) return null;

  return transformers.find((t) => normalizeCode(t.modelo) === normalizedInput) || null;
}

/**
 * Calcula a similaridade estrutural e métrica entre o código pesquisado e um transformador
 */
export function calculateItemSimilarity(
  inputCode: string,
  transformer: Transformador
): { score: number; details: MatchedCandidate['details'] } {
  const normalizedInput = normalizeCode(inputCode);
  const normalizedModel = normalizeCode(transformer.modelo);

  if (normalizedInput === normalizedModel) {
    return {
      score: 1.0,
      details: {
        prefixMatch: true,
        familyMatch: true,
        sequenceDiff: 0,
        levenshteinDist: 0,
      },
    };
  }

  const inputStruct = parseTransformerCode(normalizedInput);
  const targetStruct: CodeStructure = {
    raw: normalizedModel,
    prefix: transformer.familia_codigo.replace(/[^A-Z]/g, ''),
    familyDigits: transformer.familia_codigo.replace(/[^0-9]/g, ''),
    familyCode: transformer.familia_codigo,
    sequence: transformer.sequencia,
    suffix: '',
    strippedCode: normalizedModel,
  };

  // 1. Levenshtein básico
  const levDist = levenshteinDistance(normalizedInput, normalizedModel);
  const maxLen = Math.max(normalizedInput.length, normalizedModel.length, 1);
  const levSimilarity = Math.max(0, 1 - levDist / maxLen);

  // 2. Prefixo (ex: "DTE" vs "DTE")
  const prefixMatch = Boolean(
    inputStruct.prefix &&
    targetStruct.prefix &&
    inputStruct.prefix === targetStruct.prefix
  );
  let prefixScore = 0;
  if (prefixMatch) {
    prefixScore = 1.0;
  } else if (inputStruct.prefix && targetStruct.prefix) {
    // Prefixo parcial (ex: DM vs DMC)
    const minPrefixLen = Math.min(inputStruct.prefix.length, targetStruct.prefix.length);
    let common = 0;
    for (let i = 0; i < minPrefixLen; i++) {
      if (inputStruct.prefix[i] === targetStruct.prefix[i]) common++;
      else break;
    }
    prefixScore = common / Math.max(inputStruct.prefix.length, targetStruct.prefix.length);
  }

  // 3. Família (ex: "5220" vs "5220" ou "DTE5220" vs "DTE5220")
  const familyMatch = Boolean(
    (inputStruct.familyDigits && inputStruct.familyDigits === targetStruct.familyDigits) ||
    (inputStruct.familyCode && inputStruct.familyCode === targetStruct.familyCode)
  );
  let familyScore = 0;
  if (familyMatch) {
    familyScore = 1.0;
  } else if (inputStruct.familyDigits && targetStruct.familyDigits) {
    // Proximidade de dígitos da família
    let matchingDigits = 0;
    const len = Math.min(inputStruct.familyDigits.length, targetStruct.familyDigits.length);
    for (let i = 0; i < len; i++) {
      if (inputStruct.familyDigits[i] === targetStruct.familyDigits[i]) {
        matchingDigits++;
      }
    }
    familyScore = matchingDigits / Math.max(inputStruct.familyDigits.length, targetStruct.familyDigits.length);
  }

  // 4. Sequência e diferença de sufixo
  let sequenceDiff: number | null = null;
  let sequenceScore = 0;

  // Se o código base sem sufixo for idêntico ao modelo (ex: DTE522018X vs DTE522018)
  const isBaseIdentical = inputStruct.strippedCode && inputStruct.strippedCode === normalizedModel;

  if (isBaseIdentical) {
    sequenceDiff = 0;
    return {
      score: 0.999, // Similaridade quase 100% (apenas diferença de sufixo no final)
      details: {
        prefixMatch: true,
        familyMatch: true,
        sequenceDiff: 0,
        levenshteinDist: levDist,
      },
    };
  }

  if (inputStruct.sequence !== null && targetStruct.sequence !== null) {
    const rawDiff = targetStruct.sequence - inputStruct.sequence;
    const absDiff = Math.abs(rawDiff);
    sequenceDiff = rawDiff;

    if (familyMatch && prefixMatch) {
      if (absDiff === 0) {
        sequenceScore = 1.0;
      } else {
        sequenceScore = Math.max(0, 1 - absDiff / 15);
      }
    } else if (prefixMatch || familyScore > 0.5) {
      sequenceScore = Math.max(0, 1 - absDiff / 25) * 0.8;
    } else {
      sequenceScore = Math.max(0, 1 - absDiff / 50) * 0.4;
    }
  }

  // Ponderação estrutural:
  // - Prefixo: 25%
  // - Família: 35%
  // - Sequência: 20%
  // - Distância Levenshtein: 20%
  let totalScore =
    prefixScore * 0.25 +
    familyScore * 0.35 +
    sequenceScore * 0.20 +
    levSimilarity * 0.20;

  // Penalidade se família for completamente diferente
  if (!familyMatch && familyScore < 0.5) {
    totalScore = totalScore * 0.75;
  }

  // Se o prefixo for diferente, penaliza
  if (!prefixMatch && prefixScore < 0.5) {
    totalScore = totalScore * 0.80;
  }

  // Limitar entre 0 e 0.995 (1.0 reservado para correspondência exata, 0.999 para base idêntica sem sufixo)
  const clampedScore = Math.min(0.995, Math.max(0, totalScore));

  return {
    score: clampedScore,
    details: {
      prefixMatch,
      familyMatch,
      sequenceDiff,
      levenshteinDist: levDist,
    },
  };
}

/**
 * Determina o nível de confiança com base nos limites configuráveis
 */
export function getConfidenceLevel(score: number): "HIGH" | "MODERATE" | "LOW" {
  if (score >= APP_CONFIG.HIGH_SIMILARITY_THRESHOLD) {
    return "HIGH";
  }
  if (score >= APP_CONFIG.SIMILARITY_THRESHOLD) {
    return "MODERATE";
  }
  return "LOW";
}

/**
 * Busca o melhor transformador semelhante a um código pesquisado.
 * Retorna null se não houver candidatos cadastrados ou se o input for vazio.
 */
export function findBestMatch(
  inputCode: string,
  transformers: Transformador[]
): MatchedCandidate | null {
  const normalizedInput = normalizeCode(inputCode);
  if (!normalizedInput || transformers.length === 0) return null;

  const candidates: MatchedCandidate[] = transformers.map((t) => {
    const { score, details } = calculateItemSimilarity(normalizedInput, t);
    return {
      transformer: t,
      similarityScore: score,
      similarityPercentage: Math.round(score * 10000) / 100, // ex: 85.75
      confidenceLevel: getConfidenceLevel(score),
      details,
    };
  });

  // Ordena por pontuação de similaridade decrescente
  candidates.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    // Desempate: mesma família primeiro
    if (b.details.familyMatch !== a.details.familyMatch) {
      return b.details.familyMatch ? 1 : -1;
    }
    // Desempate: menor diferença de sequência
    const diffA = a.details.sequenceDiff !== null ? Math.abs(a.details.sequenceDiff) : 999;
    const diffB = b.details.sequenceDiff !== null ? Math.abs(b.details.sequenceDiff) : 999;
    return diffA - diffB;
  });

  return candidates[0] || null;
}

/**
 * Retorna sugestões para o autocomplete durante a digitação a partir dos transformadores ativos
 */
export function getAutocompleteSuggestions(
  inputCode: string,
  transformers: Transformador[],
  limit = 8
): Transformador[] {
  const normalized = normalizeCode(inputCode);
  if (!normalized || transformers.length === 0) return [];

  const activeTransformers = transformers.filter((t) => t.ativo !== false);

  const startsWithList: Transformador[] = [];
  const includesList: Transformador[] = [];

  for (const t of activeTransformers) {
    const modelNorm = normalizeCode(t.modelo);
    if (modelNorm.startsWith(normalized)) {
      startsWithList.push(t);
    } else if (modelNorm.includes(normalized)) {
      includesList.push(t);
    }
  }

  // Ordenação consistente
  startsWithList.sort((a, b) => a.modelo.localeCompare(b.modelo));
  includesList.sort((a, b) => a.modelo.localeCompare(b.modelo));

  return [...startsWithList, ...includesList].slice(0, limit);
}

/**
 * Extrai a família e a sequência numérica de um código ou modelo
 * Regra: a família é obtida removendo os 2 últimos caracteres numéricos do código.
 * Exemplo: DTE522018 -> família_codigo = DTE5220, sequencia = 18.
 */
export function extractFamilyAndSequence(
  inputCode: string,
  transformers?: Transformador[]
): { familyCode: string; sequence: number | null } {
  const normalized = normalizeCode(inputCode);
  if (!normalized) {
    return { familyCode: '', sequence: null };
  }

  // 1. Se existir um transformador na base com o modelo correspondente e possuir familia_codigo
  if (transformers && transformers.length > 0) {
    const existing = transformers.find((t) => normalizeCode(t.modelo) === normalized);
    if (existing && existing.familia_codigo) {
      const seq =
        typeof existing.sequencia === 'number' && !isNaN(existing.sequencia)
          ? existing.sequencia
          : null;
      return {
        familyCode: normalizeCode(existing.familia_codigo),
        sequence: seq,
      };
    }
  }

  // 2. Extração pela regra: a família é obtida removendo os 2 últimos caracteres numéricos do código
  // Suporta também possíveis sufixos de letras ao final (ex: DTE522018X -> DTE5220, 18)
  const matchWithSuffix = normalized.match(/^([A-Z0-9]+?)(\d{2})([A-Z]*)$/);
  if (matchWithSuffix) {
    const familyCode = matchWithSuffix[1];
    const sequence = parseInt(matchWithSuffix[2], 10);
    return {
      familyCode,
      sequence: isNaN(sequence) ? null : sequence,
    };
  }

  // Se tiver apenas 1 dígito numérico ao final
  const matchSingleDigit = normalized.match(/^([A-Z0-9]+?)(\d{1})([A-Z]*)$/);
  if (matchSingleDigit) {
    const familyCode = matchSingleDigit[1];
    const sequence = parseInt(matchSingleDigit[2], 10);
    return {
      familyCode,
      sequence: isNaN(sequence) ? null : sequence,
    };
  }

  return {
    familyCode: normalized,
    sequence: null,
  };
}

/**
 * Busca referências inteligentes na base de dados quando:
 * 1. O código pesquisado NÃO existe na base
 * 2. O código pesquisado existe, mas NÃO possui tempo cadastrado para AT ou BT
 *
 * REGRA ESTRITA DE FAMÍLIA:
 * 1. Obter a familia_codigo do código pesquisado (removendo os 2 últimos dígitos numéricos).
 * 2. Obter a sequencia do código pesquisado.
 * 3. Procurar referências SOMENTE dentro da mesma familia_codigo.
 * 4. Considerar somente registros:
 *    - ativo = true
 *    - com tempo válido (> 0 e não nulo) para a bobina selecionada
 *    - da mesma familia_codigo
 * 5. Ordenar pela proximidade da sequencia.
 */
export function findReferenceCandidates(
  inputCode: string,
  transformers: Transformador[],
  coilType: CoilType,
  excludeModel?: string,
  limit?: number
): ReferenceCandidate[] {
  const normalizedInput = normalizeCode(inputCode);
  if (!normalizedInput || !Array.isArray(transformers) || transformers.length === 0) return [];

  // 1. Obter a familia_codigo e sequencia do código pesquisado
  const { familyCode: targetFamilyCode, sequence: targetSequence } = extractFamilyAndSequence(
    normalizedInput,
    transformers
  );

  if (!targetFamilyCode) return [];

  const normalizedExclude = excludeModel ? normalizeCode(excludeModel) : null;

  // 2. Filtrar SOMENTE registros:
  // - ativo = true
  // - da MESMA familia_codigo (estritamente igual)
  // - com tempo válido (> 0 e não nulo) para a bobina selecionada (AT ou BT)
  // - excluindo o modelo pesquisado se solicitado (ex: código com tempo NULL)
  const validFamilyTransformers = transformers.filter((t) => {
    if (!t.ativo) return false;
    if (normalizedExclude && normalizeCode(t.modelo) === normalizedExclude) return false;

    // Verifica se possui tempo válido para a bobina selecionada
    const time = coilType === 'AT' ? t.tempo_padrao_at : t.tempo_padrao_bt;
    if (typeof time !== 'number' || isNaN(time) || time <= 0) return false;

    // Obtém a família do registro (coluna familia_codigo ou extração pelo modelo)
    const itemFamily = t.familia_codigo
      ? normalizeCode(t.familia_codigo)
      : extractFamilyAndSequence(t.modelo).familyCode;

    // Regra estrita: DEVE pertencer exatamente à mesma família
    return itemFamily === targetFamilyCode;
  });

  if (validFamilyTransformers.length === 0) return [];

  // 3. Montar lista de candidatos com relação e distância de sequência
  const candidateList: ReferenceCandidate[] = validFamilyTransformers.map((t) => {
    const timeAT = t.tempo_padrao_at;
    const timeBT = t.tempo_padrao_bt;
    const currentTime = coilType === 'AT' ? timeAT : timeBT;

    const candSequence =
      typeof t.sequencia === 'number' && !isNaN(t.sequencia)
        ? t.sequencia
        : extractFamilyAndSequence(t.modelo).sequence;

    let sequenceDiff: number | null = null;
    let relationType: ReferenceCandidate['relationType'] = 'MESMA_FAMILIA';
    let relationLabel = 'Mesma Família';

    if (targetSequence !== null && candSequence !== null) {
      sequenceDiff = candSequence - targetSequence;
      if (sequenceDiff === 0) {
        relationType = 'MAIS_PROXIMO';
        relationLabel = 'Mais Próximo';
      } else if (sequenceDiff < 0) {
        relationType = 'ANTERIOR';
        relationLabel = 'Anterior';
      } else {
        relationType = 'POSTERIOR';
        relationLabel = 'Posterior';
      }
    }

    return {
      transformer: t,
      relationType,
      relationLabel,
      sequenceDiff,
      similarityScore: 1.0,
      timeAT,
      timeBT,
      currentTime,
    };
  });

  // 4. Organizar as referências pela proximidade da sequência pesquisada:
  // - TODOS os anteriores disponíveis ordenados pela proximidade: -1, -2, -3...
  // - TODOS os posteriores disponíveis ordenados pela proximidade: +1, +2, +3...
  // - Mesmo código/sequência se houver (0)
  // - Outros registros da mesma família sem sequência definida
  const anteriores: ReferenceCandidate[] = [];
  const posteriores: ReferenceCandidate[] = [];
  const mesmoOuZero: ReferenceCandidate[] = [];
  const semSequencia: ReferenceCandidate[] = [];

  for (const cand of candidateList) {
    if (cand.sequenceDiff === 0) {
      mesmoOuZero.push(cand);
    } else if (cand.sequenceDiff !== null && cand.sequenceDiff < 0) {
      anteriores.push(cand);
    } else if (cand.sequenceDiff !== null && cand.sequenceDiff > 0) {
      posteriores.push(cand);
    } else {
      semSequencia.push(cand);
    }
  }

  // Anteriores ordenados do mais próximo para o mais distante:
  // Ex: para seq 18 -> DTE522017 (-1), DTE522016 (-2), DTE522015 (-3)...
  anteriores.sort((a, b) => (b.sequenceDiff ?? 0) - (a.sequenceDiff ?? 0));

  // Posteriores ordenados do mais próximo para o mais distante:
  // Ex: para seq 18 -> DTE522019 (+1), DTE522020 (+2), DTE522021 (+3), DTE522022 (+4)...
  posteriores.sort((a, b) => (a.sequenceDiff ?? 0) - (b.sequenceDiff ?? 0));

  // Sem sequência definida: ordenação alfabética pelo modelo
  semSequencia.sort((a, b) => a.transformer.modelo.localeCompare(b.transformer.modelo));

  const sortedCandidates = [...mesmoOuZero, ...anteriores, ...posteriores, ...semSequencia];

  // NÃO limitar a quantidade de referências (exibir todos os registros da mesma família)
  if (typeof limit === 'number' && limit > 0) {
    return sortedCandidates.slice(0, limit);
  }

  return sortedCandidates;
}

