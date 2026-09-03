export interface Transformador {
  id?: string | number;
  modelo: string;
  linha: string;
  potencia?: number | string | null;
  classe?: string | null;
  familia_codigo: string;
  sequencia: number;
  tempo_padrao_at: number | null;
  tempo_padrao_bt: number | null;
  meta_hora_hora_at?: number | null;
  meta_diaria_normal_at?: number | null;
  meta_diaria_reduzida_at?: number | null;
  meta_hora_hora_bt?: number | null;
  meta_diaria_normal_bt?: number | null;
  meta_diaria_reduzida_bt?: number | null;
  espiras_alta?: number | null;
  espiras_baixa?: number | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export type JornadaType = "NORMAL" | "REDUZIDO";

export type CoilType = "AT" | "BT";

export type ItemMatchType = "EXACT" | "NOT_FOUND_REFERENCES" | "MISSING_TIME_REFERENCES";

export interface ProductionItem {
  id: string;
  searchedCode: string;
  usedTransformer: Transformador | null;
  matchType?: ItemMatchType;
  selectedReferences?: Transformador[];
  calculatedUnitTime?: number | null;
  isSimilarMatch?: boolean; // legacy compatibility
  similarityScore?: number;
  quantity: number | "";
}

export interface ReferenceCandidate {
  transformer: Transformador;
  relationType: "ANTERIOR" | "POSTERIOR" | "MESMA_FAMILIA" | "SIMILAR" | "MAIS_PROXIMO";
  relationLabel: string;
  sequenceDiff: number | null;
  similarityScore: number;
  timeAT: number | null;
  timeBT: number | null;
  currentTime: number | null;
}

export interface MatchedCandidate {
  transformer: Transformador;
  similarityScore: number;
  similarityPercentage: number;
  confidenceLevel: "HIGH" | "MODERATE" | "LOW";
  details: {
    prefixMatch: boolean;
    familyMatch: boolean;
    sequenceDiff: number | null;
    levenshteinDist: number;
  };
}

export interface CalculationSummary {
  totalProducedTime: number;
  dailyCapacity: number;
  remainingTime: number;
  excessTime: number;
  isOverCapacity: boolean;
  efficiency: number;
  validItemsCount: number;
  totalItemsCount: number;
  totalQuantity: number;
  averageTimePerCoil: number | null;
  theoreticalCapacity: number | null;
  integerCapacity: number | null;
  hasMissingTimeItems: boolean;
  activeItems: ProductionItem[];
  coilType: CoilType;
}

export interface SpreadsheetModelItem {
  linha: string;
  potencia: number | string | null;
  modelo: string;
  classe: string | null;
  meta_hora_hora_bt: number | null;
  meta_hora_hora_at: number | null;
  meta_diaria_normal_bt: number | null;
  meta_diaria_normal_at: number | null;
  meta_diaria_reduzida_bt: number | null;
  meta_diaria_reduzida_at: number | null;
  tempo_padrao_bt: number | null;
  tempo_padrao_at: number | null;
  espiras_baixa: number | null;
  espiras_alta: number | null;
}

export interface SpreadsheetValidationResult {
  fileName: string;
  fileSize: number;
  sheetName: string;
  totalRows: number;
  validCount: number;
  missingTimeATCount: number;
  missingTimeBTCount: number;
  duplicateCount: number;
  duplicates: string[];
  errors: string[];
  warnings: string[];
  previewItems: SpreadsheetModelItem[];
  allItems: SpreadsheetModelItem[];
  isValid: boolean;
}

export interface SyncResult {
  total_planilha: number;
  atualizados: number;
  novos: number;
  excluidos: number;
  sem_tempo_at: number;
  sem_tempo_bt: number;
}

