import * as XLSX from 'xlsx';
import { SpreadsheetModelItem, SpreadsheetValidationResult, SyncResult } from '../types';

/**
 * Normaliza o cabeçalho para facilitar correspondência sem case-sensitive ou espaços extras
 */
function normalizeHeaderName(header: string): string {
  return (header || '')
    .toString()
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-_]+/g, '_');
}

/**
 * Converte valor de célula para número limpo ou null (NUNCA converte vazio em 0)
 * Preserva a precisão numérica original (ponto flutuante puro sem arredondamentos prévios).
 */
function parseNumericCell(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  const str = String(val).replace(/\u00A0/g, ' ').trim();
  if (str === '' || str === '-' || str === 'null' || str === 'NULL' || str === 'N/A' || str === 'NA') {
    return null;
  }
  
  let cleaned = str;
  // Trata separadores decimais e de milhar no padrão brasileiro e internacional
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      // Formato brasileiro: 1.234,5678 -> 1234.5678
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato internacional: 1,234.5678 -> 1234.5678
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // 28,0398 -> 28.0398
    cleaned = cleaned.replace(',', '.');
  }

  const num = Number(cleaned);
  if (!isNaN(num)) return num;

  const parsedFloat = parseFloat(cleaned);
  return isNaN(parsedFloat) ? null : parsedFloat;
}

/**
 * Converte valor de célula para texto limpo e maiúsculo ou null
 */
function parseTextCell(val: any, toUpper = false): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (str === '' || str === '-' || str === 'null' || str === 'NULL') return null;
  return toUpper ? str.toUpperCase() : str;
}

/**
 * Lê e valida o arquivo Excel (.xlsx / .xls)
 */
export async function parseExcelFile(file: File): Promise<SpreadsheetValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return {
        fileName: file.name,
        fileSize: file.size,
        sheetName: '',
        totalRows: 0,
        validCount: 0,
        missingTimeATCount: 0,
        missingTimeBTCount: 0,
        duplicateCount: 0,
        duplicates: [],
        errors: ['O arquivo selecionado está vazio (0 bytes).'],
        warnings: [],
        previewItems: [],
        allItems: [],
        isValid: false,
      };
    }

    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: false,
      raw: true,
    });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        fileName: file.name,
        fileSize: file.size,
        sheetName: '',
        totalRows: 0,
        validCount: 0,
        missingTimeATCount: 0,
        missingTimeBTCount: 0,
        duplicateCount: 0,
        duplicates: [],
        errors: ['Nenhuma planilha foi encontrada dentro do arquivo Excel.'],
        warnings: [],
        previewItems: [],
        allItems: [],
        isValid: false,
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      return {
        fileName: file.name,
        fileSize: file.size,
        sheetName: firstSheetName,
        totalRows: 0,
        validCount: 0,
        missingTimeATCount: 0,
        missingTimeBTCount: 0,
        duplicateCount: 0,
        duplicates: [],
        errors: [`Não foi possível ler os dados da planilha "${firstSheetName}".`],
        warnings: [],
        previewItems: [],
        allItems: [],
        isValid: false,
      };
    }

    // Converte a planilha em matriz bruta preservando os números reais não truncados
    const rawRows = XLSX.utils.sheet_to_json<any>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
      raw: true,
      rawNumbers: true,
    }) as any[][];

    if (!rawRows || rawRows.length === 0) {
      return {
        fileName: file.name,
        fileSize: file.size,
        sheetName: firstSheetName,
        totalRows: 0,
        validCount: 0,
        missingTimeATCount: 0,
        missingTimeBTCount: 0,
        duplicateCount: 0,
        duplicates: [],
        errors: ['A planilha está vazia.'],
        warnings: [],
        previewItems: [],
        allItems: [],
        isValid: false,
      };
    }

    // Primeira linha contém os cabeçalhos
    const rawHeaders: any[] = rawRows[0] || [];
    const headerMap = new Map<string, number>();

    rawHeaders.forEach((h, index) => {
      if (h !== null && h !== undefined) {
        const norm = normalizeHeaderName(String(h));
        if (norm) {
          headerMap.set(norm, index);
        }
      }
    });

    // Helper para achar índice de coluna por múltiplos nomes possíveis
    const getColIndex = (...candidates: string[]): number | undefined => {
      for (const cand of candidates) {
        const norm = normalizeHeaderName(cand);
        if (headerMap.has(norm)) {
          return headerMap.get(norm);
        }
      }
      return undefined;
    };

    const idxLinha = getColIndex('LINHA');
    const idxModelo = getColIndex('MODELO');
    const idxPotencia = getColIndex('POTENCIA', 'POT');
    const idxClasse = getColIndex('CLASSE', 'CLASSE_ISOLAMENTO');
    const idxMetaHhBt = getColIndex('META_HORA_HORA_BT', 'META_HORA_BT', 'META_HH_BT');
    const idxMetaHhAt = getColIndex('META_HORA_HORA_AT', 'META_HORA_AT', 'META_HH_AT');
    const idxMetaNormBt = getColIndex('META_DIARIA_HORARIO_NORMAL_BT', 'META_DIARIA_NORMAL_BT');
    const idxMetaNormAt = getColIndex('META_DIARIA_HORARIO_NORMAL_AT', 'META_DIARIA_NORMAL_AT');
    const idxMetaRedBt = getColIndex('META_DIARIA_HORARIO_REDUZIDO_BT', 'META_DIARIA_REDUZIDA_BT');
    const idxMetaRedAt = getColIndex('META_DIARIA_HORARIO_REDUZIDO_AT', 'META_DIARIA_REDUZIDA_AT');
    const idxTempoBt = getColIndex('TEMPO_PADRAO_BT', 'TEMPO_BT');
    const idxTempoAt = getColIndex('TEMPO_PADRAO_AT', 'TEMPO_AT');
    const idxEspBaixa = getColIndex('N_ESPIRAS_BAIXA', 'ESPIRAS_BAIXA', 'ESPIRAS_BT');
    const idxEspAlta = getColIndex('N_ESPIRAS_ALTA', 'ESPIRAS_ALTA', 'ESPIRAS_AT');

    // Validação de colunas obrigatórias
    if (idxModelo === undefined) {
      errors.push('Coluna obrigatória "MODELO" não foi encontrada na planilha.');
    }
    if (idxLinha === undefined) {
      errors.push('Coluna obrigatória "LINHA" não foi encontrada na planilha.');
    }

    if (errors.length > 0) {
      return {
        fileName: file.name,
        fileSize: file.size,
        sheetName: firstSheetName,
        totalRows: rawRows.length - 1,
        validCount: 0,
        missingTimeATCount: 0,
        missingTimeBTCount: 0,
        duplicateCount: 0,
        duplicates: [],
        errors,
        warnings,
        previewItems: [],
        allItems: [],
        isValid: false,
      };
    }

    const dataRows = rawRows.slice(1);
    if (dataRows.length === 0) {
      errors.push('A planilha possui apenas a linha de cabeçalho e nenhum registro de modelo.');
      return {
        fileName: file.name,
        fileSize: file.size,
        sheetName: firstSheetName,
        totalRows: 0,
        validCount: 0,
        missingTimeATCount: 0,
        missingTimeBTCount: 0,
        duplicateCount: 0,
        duplicates: [],
        errors,
        warnings,
        previewItems: [],
        allItems: [],
        isValid: false,
      };
    }

    const allItems: SpreadsheetModelItem[] = [];
    const seenKeys = new Map<string, number>(); // Chave MODELO+LINHA -> primeira linha
    const duplicates: string[] = [];
    let missingTimeATCount = 0;
    let missingTimeBTCount = 0;

    dataRows.forEach((row, rowIdx) => {
      const lineNum = rowIdx + 2; // Linha real no Excel (1-indexed + cabeçalho)
      
      // Ignorar linhas totalmente vazias
      const isRowEmpty = !row || row.every((c) => c === null || c === undefined || String(c).trim() === '');
      if (isRowEmpty) {
        return;
      }

      const modeloRaw = idxModelo !== undefined ? row[idxModelo] : null;
      const linhaRaw = idxLinha !== undefined ? row[idxLinha] : null;

      const modelo = parseTextCell(modeloRaw, true);
      const linha = parseTextCell(linhaRaw, true);

      if (!modelo) {
        errors.push(`Linha ${lineNum}: Campo "MODELO" está vazio.`);
      }
      if (!linha) {
        errors.push(`Linha ${lineNum}: Campo "LINHA" está vazio.`);
      }

      if (modelo && linha) {
        const compositeKey = `${modelo}___${linha}`;
        if (seenKeys.has(compositeKey)) {
          const firstLine = seenKeys.get(compositeKey);
          duplicates.push(`Modelo "${modelo}" com Linha "${linha}" (Linhas ${firstLine} e ${lineNum})`);
        } else {
          seenKeys.set(compositeKey, lineNum);
        }
      }

      const potenciaRaw = idxPotencia !== undefined ? row[idxPotencia] : null;
      const potenciaParsed = parseNumericCell(potenciaRaw);
      const potencia = potenciaParsed !== null ? potenciaParsed : parseTextCell(potenciaRaw, true);

      const classe = idxClasse !== undefined ? parseTextCell(row[idxClasse], true) : null;
      const metaHhBt = idxMetaHhBt !== undefined ? parseNumericCell(row[idxMetaHhBt]) : null;
      const metaHhAt = idxMetaHhAt !== undefined ? parseNumericCell(row[idxMetaHhAt]) : null;
      const metaNormBt = idxMetaNormBt !== undefined ? parseNumericCell(row[idxMetaNormBt]) : null;
      const metaNormAt = idxMetaNormAt !== undefined ? parseNumericCell(row[idxMetaNormAt]) : null;
      const metaRedBt = idxMetaRedBt !== undefined ? parseNumericCell(row[idxMetaRedBt]) : null;
      const metaRedAt = idxMetaRedAt !== undefined ? parseNumericCell(row[idxMetaRedAt]) : null;

      const tempoBt = idxTempoBt !== undefined ? parseNumericCell(row[idxTempoBt]) : null;
      const tempoAt = idxTempoAt !== undefined ? parseNumericCell(row[idxTempoAt]) : null;

      const espirasBaixa = idxEspBaixa !== undefined ? parseNumericCell(row[idxEspBaixa]) : null;
      const espirasAlta = idxEspAlta !== undefined ? parseNumericCell(row[idxEspAlta]) : null;

      if (tempoAt === null) missingTimeATCount++;
      if (tempoBt === null) missingTimeBTCount++;

      const item: SpreadsheetModelItem = {
        linha: linha || '',
        modelo: modelo || '',
        potencia: potencia ?? null,
        classe: classe ?? null,
        meta_hora_hora_bt: metaHhBt,
        meta_hora_hora_at: metaHhAt,
        meta_diaria_normal_bt: metaNormBt,
        meta_diaria_normal_at: metaNormAt,
        meta_diaria_reduzida_bt: metaRedBt,
        meta_diaria_reduzida_at: metaRedAt,
        tempo_padrao_bt: tempoBt,
        tempo_padrao_at: tempoAt,
        espiras_baixa: espirasBaixa,
        espiras_alta: espirasAlta,
      };

      allItems.push(item);
    });

    if (duplicates.length > 0) {
      errors.push(
        `Foram encontradas ${duplicates.length} duplicidade(s) de MODELO + LINHA na planilha. Cada combinação de MODELO + LINHA deve ser única.`
      );
    }

    if (allItems.length === 0 && errors.length === 0) {
      errors.push('Nenhum registro de modelo válido foi encontrado na planilha.');
    }

    const isValid = errors.length === 0;

    return {
      fileName: file.name,
      fileSize: file.size,
      sheetName: firstSheetName,
      totalRows: allItems.length,
      validCount: isValid ? allItems.length : 0,
      missingTimeATCount,
      missingTimeBTCount,
      duplicateCount: duplicates.length,
      duplicates,
      errors,
      warnings,
      previewItems: allItems.slice(0, 8),
      allItems,
      isValid,
    };
  } catch (err: any) {
    return {
      fileName: file.name,
      fileSize: file.size,
      sheetName: '',
      totalRows: 0,
      validCount: 0,
      missingTimeATCount: 0,
      missingTimeBTCount: 0,
      duplicateCount: 0,
      duplicates: [],
      errors: [`Erro ao ler arquivo Excel: ${err?.message || 'Arquivo corrompido ou formato não suportado'}`],
      warnings: [],
      previewItems: [],
      allItems: [],
      isValid: false,
    };
  }
}

/**
 * Envia os dados validados da planilha para o endpoint backend `/api/admin/atualizar-base`
 * Protegido por senha administrativa e executado via service_role (SUPABASE_SECRET_KEY)
 */
export async function syncSpreadsheetToSupabase(
  items: SpreadsheetModelItem[],
  adminPassword?: string
): Promise<SyncResult> {
  const response = await fetch('/api/admin/atualizar-base', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(adminPassword ? { 'x-admin-password': adminPassword } : {}),
    },
    body: JSON.stringify({
      p_dados: items,
      password: adminPassword,
    }),
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    const errorMsg = json?.error || `Falha na requisição (Status ${response.status})`;
    const err = new Error(errorMsg) as any;
    err.missingSecretKey = Boolean(json?.missingSecretKey);
    err.missingAdminPassword = Boolean(json?.missingAdminPassword);
    err.invalidPassword = Boolean(json?.invalidPassword);
    err.statusCode = response.status;
    throw err;
  }

  const rawData = json.data || {};

  return {
    total_planilha: typeof rawData.total_planilha === 'number' ? rawData.total_planilha : items.length,
    atualizados: typeof rawData.atualizados === 'number' ? rawData.atualizados : 0,
    novos: typeof rawData.novos === 'number' ? rawData.novos : 0,
    excluidos: typeof rawData.excluidos === 'number' ? rawData.excluidos : 0,
    sem_tempo_at: typeof rawData.sem_tempo_at === 'number' ? rawData.sem_tempo_at : 0,
    sem_tempo_bt: typeof rawData.sem_tempo_bt === 'number' ? rawData.sem_tempo_bt : 0,
  };
}

/**
 * Verifica o status do servidor administrativo
 */
export async function checkAdminServerStatus(): Promise<{
  supabaseUrlConfigured: boolean;
  secretKeyConfigured: boolean;
  adminPasswordConfigured: boolean;
}> {
  try {
    const res = await fetch('/api/admin/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Servidor ainda iniciando ou em fallback
  }
  return {
    supabaseUrlConfigured: false,
    secretKeyConfigured: false,
    adminPasswordConfigured: false,
  };
}
