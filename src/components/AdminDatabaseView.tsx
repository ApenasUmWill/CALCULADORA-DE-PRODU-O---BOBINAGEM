import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Trash2,
  Table,
  Info,
  ShieldAlert,
  Database,
  Check,
  X,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { SpreadsheetModelItem, SpreadsheetValidationResult, SyncResult } from '../types';
import {
  parseExcelFile,
  syncSpreadsheetToSupabase,
  checkAdminServerStatus,
} from '../services/spreadsheetService';
import { formatUnitTime } from '../utils/calculations';

/**
 * Formata valores numéricos de tempo para exibição visual limpa na tabela de prévia,
 * removendo artefatos de ponto flutuante do JavaScript (máx 6 casas decimais, sem zeros à direita)
 * e utilizando o padrão brasileiro (vírgula).
 * IMPORTANTE: Isso afeta estritamente a renderização visual da tabela. O dado original em memória
 * e no payload de envio ao backend permanece 100% inalterado como número puro de ponto flutuante.
 */
function formatPreviewTime(val: number | null): string {
  if (val === null || val === undefined || isNaN(val)) return '';
  const rounded = Number(val.toFixed(6));
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(rounded);
}

interface AdminDatabaseViewProps {
  onBackToCalculator: () => void;
  onDatabaseUpdated: () => Promise<void>;
}

export const AdminDatabaseView: React.FC<AdminDatabaseViewProps> = ({
  onBackToCalculator,
  onDatabaseUpdated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [validationResult, setValidationResult] = useState<SpreadsheetValidationResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [missingSecretKeyAlert, setMissingSecretKeyAlert] = useState(false);
  const [missingPasswordAlert, setMissingPasswordAlert] = useState(false);
  const [serverStatus, setServerStatus] = useState<{
    supabaseUrlConfigured: boolean;
    secretKeyConfigured: boolean;
    adminPasswordConfigured: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAdminServerStatus().then(setServerStatus);
  }, []);

  const handleFileProcess = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setValidationResult({
        fileName: file.name,
        fileSize: file.size,
        sheetName: '',
        totalRows: 0,
        validCount: 0,
        missingTimeATCount: 0,
        missingTimeBTCount: 0,
        duplicateCount: 0,
        duplicates: [],
        errors: ['Formato de arquivo inválido. Por favor, selecione um arquivo Excel (.xlsx ou .xls).'],
        warnings: [],
        previewItems: [],
        allItems: [],
        isValid: false,
      });
      setSelectedFile(file);
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    setSyncResult(null);
    setSyncError(null);
    setMissingSecretKeyAlert(false);
    setMissingPasswordAlert(false);
    setPasswordError(null);

    try {
      const result = await parseExcelFile(file);
      setValidationResult(result);
    } catch (err: any) {
      setValidationResult({
        fileName: file.name,
        fileSize: file.size,
        sheetName: '',
        totalRows: 0,
        validCount: 0,
        missingTimeATCount: 0,
        missingTimeBTCount: 0,
        duplicateCount: 0,
        duplicates: [],
        errors: [`Erro no processamento da planilha: ${err?.message || 'Arquivo ilegível'}`],
        warnings: [],
        previewItems: [],
        allItems: [],
        isValid: false,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setSyncResult(null);
    setSyncError(null);
    setMissingSecretKeyAlert(false);
    setMissingPasswordAlert(false);
    setAdminPassword('');
    setPasswordError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenConfirmModal = () => {
    setPasswordError(null);
    setSyncError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmAndSync = async () => {
    if (!validationResult || !validationResult.isValid || validationResult.allItems.length === 0) {
      return;
    }

    if (!adminPassword.trim()) {
      setPasswordError('Por favor, informe a senha administrativa para prosseguir.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setPasswordError(null);
    setMissingSecretKeyAlert(false);
    setMissingPasswordAlert(false);

    try {
      const res = await syncSpreadsheetToSupabase(validationResult.allItems, adminPassword.trim());
      setSyncResult(res);
      setShowConfirmModal(false);
      setAdminPassword('');

      // Recarrega a base em memória na calculadora
      await onDatabaseUpdated();
    } catch (err: any) {
      console.error('[Admin] Erro na sincronização:', err);
      const msg = err?.message || 'Erro ao sincronizar dados com o Supabase.';
      
      if (err?.invalidPassword) {
        setPasswordError('Senha administrativa incorreta. Verifique a senha e tente novamente.');
      } else if (err?.missingAdminPassword) {
        setPasswordError(msg);
        setMissingPasswordAlert(true);
      } else {
        setSyncError(msg);
        setShowConfirmModal(false);
      }

      if (err?.missingSecretKey) {
        setMissingSecretKeyAlert(true);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header com Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToCalculator}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Calculadora</span>
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                <Database className="w-4 h-4" />
              </span>
              <h1 className="text-base font-bold font-mono text-slate-900 tracking-tight">
                ATUALIZAR BASE DE MODELOS
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sincronização oficial da tabela <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded font-mono">public.transformadores</code> via planilha Excel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {serverStatus && !serverStatus.secretKeyConfigured && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] font-mono text-amber-800">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>SUPABASE_SECRET_KEY pendente em Secrets</span>
            </div>
          )}
          {serverStatus && !serverStatus.adminPasswordConfigured && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200/80 rounded-lg text-[11px] font-mono text-rose-800">
              <Lock className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
              <span>ADMIN_UPDATE_PASSWORD pendente em Secrets</span>
            </div>
          )}
        </div>
      </div>

      {/* Alerta de Aviso sobre Exclusão Permanente */}
      <div className="bg-amber-50/70 border-l-4 border-amber-500 p-4 rounded-r-xl border-y border-r border-amber-200/60 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-amber-900 uppercase font-mono tracking-wider">
              Atenção: Fonte Oficial de Dados
            </div>
            <p className="text-amber-800 leading-relaxed">
              A planilha importada será a <strong>fonte oficial</strong> da base. Modelos existentes serão atualizados, novos modelos serão adicionados e <span className="font-bold underline text-amber-950">modelos ausentes nesta planilha serão excluídos permanentemente</span> do banco de dados.
            </p>
          </div>
        </div>
      </div>

      {/* Resultado de Sucesso */}
      {syncResult && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-emerald-200">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-emerald-950 uppercase tracking-wider">
                BASE ATUALIZADA COM SUCESSO
              </h2>
              <p className="text-xs text-emerald-800">
                A tabela <code className="font-mono font-bold">public.transformadores</code> foi sincronizada e a calculadora já foi recarregada.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div className="bg-white p-3 rounded-lg border border-emerald-200/80 shadow-2xs">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Total na Planilha</div>
              <div className="text-lg font-mono font-bold text-slate-900">{syncResult.total_planilha}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200/80 shadow-2xs">
              <div className="text-[10px] font-mono text-blue-600 uppercase">Atualizados</div>
              <div className="text-lg font-mono font-bold text-blue-700">{syncResult.atualizados}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200/80 shadow-2xs">
              <div className="text-[10px] font-mono text-emerald-600 uppercase">Novos</div>
              <div className="text-lg font-mono font-bold text-emerald-700">{syncResult.novos}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200/80 shadow-2xs">
              <div className="text-[10px] font-mono text-rose-600 uppercase">Excluídos</div>
              <div className="text-lg font-mono font-bold text-rose-700">{syncResult.excluidos}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200/80 shadow-2xs">
              <div className="text-[10px] font-mono text-amber-600 uppercase">Sem Tempo AT</div>
              <div className="text-lg font-mono font-bold text-amber-700">{syncResult.sem_tempo_at}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200/80 shadow-2xs">
              <div className="text-[10px] font-mono text-amber-600 uppercase">Sem Tempo BT</div>
              <div className="text-lg font-mono font-bold text-amber-700">{syncResult.sem_tempo_bt}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClearFile}
              className="px-4 py-2 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 font-mono text-xs font-semibold cursor-pointer transition-colors"
            >
              Importar Outra Planilha
            </button>
            <button
              type="button"
              onClick={onBackToCalculator}
              className="px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 font-mono text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ir para a Calculadora</span>
            </button>
          </div>
        </div>
      )}

      {/* Alerta de Erro de Sincronização */}
      {syncError && (
        <div className="bg-rose-50 border border-rose-300 p-4 rounded-xl shadow-sm text-xs space-y-2">
          <div className="flex items-start gap-2 text-rose-900 font-bold font-mono uppercase">
            <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>Falha ao Sincronizar Base</span>
          </div>
          <p className="text-rose-800 font-mono pl-6 leading-relaxed whitespace-pre-wrap">{syncError}</p>

          {missingSecretKeyAlert && (
            <div className="ml-6 p-3 bg-white rounded-lg border border-rose-200 text-[11px] text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">Como configurar a chave de serviço:</div>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Acesse o painel do <strong>Supabase</strong> $\rightarrow$ <em>Project Settings</em> $\rightarrow$ <em>API</em>.</li>
                <li>Copie a chave <strong>service_role (secret)</strong>.</li>
                <li>No menu <strong>Settings / Secrets</strong> deste aplicativo, configure o segredo com o nome <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">SUPABASE_SECRET_KEY</code>.</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Área de Seleção de Arquivo */}
      {!syncResult && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
              {isParsing ? (
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              ) : (
                <FileSpreadsheet className="w-6 h-6" />
              )}
            </div>

            <div className="text-sm font-semibold text-slate-800 mb-1">
              {isParsing ? 'Lendo e validando planilha Excel...' : 'Clique para selecionar a planilha ou arraste o arquivo aqui'}
            </div>
            <p className="text-xs text-slate-500">
              Formatos suportados: <span className="font-mono font-medium text-slate-700">.xlsx</span> ou <span className="font-mono font-medium text-slate-700">.xls</span> (lê a primeira aba)
            </p>
          </div>

          {/* Dados do Arquivo Selecionado & Validação */}
          {selectedFile && validationResult && (
            <div className="space-y-5 pt-2">
              {/* Barra de Informações do Arquivo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono">
                <div className="flex items-center gap-2.5 truncate">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{validationResult.fileName}</span>
                  <span className="text-slate-400">({(validationResult.fileSize / 1024).toFixed(1)} KB)</span>
                  {validationResult.sheetName && (
                    <span className="text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded text-[11px]">
                      Aba: {validationResult.sheetName}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleClearFile}
                  className="self-end sm:self-auto text-rose-600 hover:text-rose-800 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover</span>
                </button>
              </div>

              {/* Erros de Validação (se houver) */}
              {!validationResult.isValid && validationResult.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-bold font-mono uppercase">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <span>Planilha Inválida — Atualização Bloqueada ({validationResult.errors.length} erro(s))</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-rose-800 font-mono text-[11px] max-h-48 overflow-y-auto">
                    {validationResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                  {validationResult.duplicates.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-rose-200">
                      <div className="font-bold text-rose-900 text-[11px] uppercase mb-1">Duplicidades encontradas:</div>
                      <div className="space-y-0.5 text-[10px] text-rose-700 max-h-28 overflow-y-auto bg-white/60 p-2 rounded border border-rose-200">
                        {validationResult.duplicates.map((dup, i) => (
                          <div key={i}>• {dup}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resumo Estatístico da Validação */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Total de Registros</div>
                  <div className="text-base font-mono font-bold text-slate-900">{validationResult.totalRows}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Sem Tempo AT</div>
                  <div className={`text-base font-mono font-bold ${validationResult.missingTimeATCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {validationResult.missingTimeATCount}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Sem Tempo BT</div>
                  <div className={`text-base font-mono font-bold ${validationResult.missingTimeBTCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {validationResult.missingTimeBTCount}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Duplicidades (Mod+Linha)</div>
                  <div className={`text-base font-mono font-bold ${validationResult.duplicateCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {validationResult.duplicateCount}
                  </div>
                </div>
              </div>

              {/* Tabela de Prévia dos Registros */}
              {validationResult.previewItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                    <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-slate-500" />
                      Prévia dos Dados (Primeiras {validationResult.previewItems.length} linhas)
                    </span>
                    <span className="text-[11px] text-slate-400">Total: {validationResult.totalRows} registros</span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs max-h-64">
                    <table className="w-full text-left border-collapse text-[11px] font-mono">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-600 uppercase text-[10px] border-b border-slate-200 sticky top-0">
                          <th className="py-2 px-2.5 font-bold">#</th>
                          <th className="py-2 px-2.5 font-bold text-blue-700">MODELO</th>
                          <th className="py-2 px-2.5 font-bold">LINHA</th>
                          <th className="py-2 px-2.5 font-bold">POTÊNCIA</th>
                          <th className="py-2 px-2.5 font-bold">CLASSE</th>
                          <th className="py-2 px-2.5 font-bold text-right text-amber-700">TEMPO AT</th>
                          <th className="py-2 px-2.5 font-bold text-right text-emerald-700">TEMPO BT</th>
                          <th className="py-2 px-2.5 font-bold text-right">ESPIRAS AT</th>
                          <th className="py-2 px-2.5 font-bold text-right">ESPIRAS BT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {validationResult.previewItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-1.5 px-2.5 text-slate-400 text-[10px]">{idx + 1}</td>
                            <td className="py-1.5 px-2.5 font-bold text-blue-700">{item.modelo}</td>
                            <td className="py-1.5 px-2.5 font-medium">{item.linha}</td>
                            <td className="py-1.5 px-2.5">{item.potencia ?? '—'}</td>
                            <td className="py-1.5 px-2.5">{item.classe ?? '—'}</td>
                            <td className="py-1.5 px-2.5 text-right font-medium">
                              {item.tempo_padrao_at !== null ? `${formatPreviewTime(item.tempo_padrao_at)} min/un` : <span className="text-slate-300">null</span>}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-medium">
                              {item.tempo_padrao_bt !== null ? `${formatPreviewTime(item.tempo_padrao_bt)} min/un` : <span className="text-slate-300">null</span>}
                            </td>
                            <td className="py-1.5 px-2.5 text-right text-slate-600">{item.espiras_alta ?? '—'}</td>
                            <td className="py-1.5 px-2.5 text-right text-slate-600">{item.espiras_baixa ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Botão de Ação de Atualização */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>A validação é executada antes do envio. Nenhuma alteração é feita sem confirmação.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-mono text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={!validationResult.isValid || isSyncing}
                    onClick={handleOpenConfirmModal}
                    className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-mono text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                      validationResult.isValid && !isSyncing
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sincronizando com Supabase...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Confirmar atualização da base</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmação Protegido por Senha Administrativa */}
      {showConfirmModal && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-mono text-slate-900 tracking-tight">
                  Confirmar Atualização da Base?
                </h3>
                <p className="text-xs text-slate-500">
                  Operação administrativa com autenticação server-side
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900 leading-relaxed space-y-2">
              <p className="font-semibold">
                Esta operação atualizará os modelos existentes, adicionará novos modelos e excluirá permanentemente do banco os modelos que não estiverem presentes nesta planilha. Deseja continuar?
              </p>
              <div className="text-[11px] text-amber-800/90 font-mono pt-1">
                • Total de registros a sincronizar: <strong>{validationResult.totalRows}</strong>
              </div>
            </div>

            {/* Campo de Senha Administrativa */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="block text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Senha Administrativa (ADMIN_UPDATE_PASSWORD)</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSyncing) {
                      e.preventDefault();
                      handleConfirmAndSync();
                    }
                  }}
                  autoFocus
                  placeholder="Digite a senha administrativa do servidor..."
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-xs font-mono transition-all outline-none ${
                    passwordError
                      ? 'border-rose-300 bg-rose-50/50 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-mono">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {serverStatus && !serverStatus.adminPasswordConfigured && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 font-mono">
                  ⚠️ Aviso: A variável <code>ADMIN_UPDATE_PASSWORD</code> precisa estar definida no painel Secrets do servidor.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => {
                  setShowConfirmModal(false);
                  setPasswordError(null);
                }}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-mono text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={handleConfirmAndSync}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-mono text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Autenticando & Atualizando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar e atualizar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
