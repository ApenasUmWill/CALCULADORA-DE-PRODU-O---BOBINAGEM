import { createClient } from '@supabase/supabase-js';

/**
 * Vercel Serverless Function
 * Mantém exatamente as mesmas validações, higienização e regras da rota
 * POST /api/admin/atualizar-base definida em server.ts.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(404).end();
  }

  try {
    const { p_dados, password } = req.body || {};
    const headerPassword = req.headers['x-admin-password'] as string | undefined;
    const providedPassword = password || headerPassword;

    // 1. Verificação de Autenticação Server-Side (ADMIN_UPDATE_PASSWORD)
    const expectedPassword = process.env.ADMIN_UPDATE_PASSWORD;

    if (!expectedPassword) {
      return res.status(503).json({
        error:
          'A variável ADMIN_UPDATE_PASSWORD não está configurada nos Secrets do servidor. Configure a senha administrativa em Secrets para autorizar a sincronização.',
        missingAdminPassword: true,
      });
    }

    if (!providedPassword || providedPassword.trim() !== expectedPassword.trim()) {
      return res.status(401).json({
        error: 'Senha administrativa incorreta ou não fornecida. Operação não autorizada.',
        invalidPassword: true,
      });
    }

    // 2. Validações Rigorosas dos Dados no Backend
    if (!p_dados || !Array.isArray(p_dados)) {
      return res.status(400).json({
        error: 'Formato inválido: "p_dados" deve ser um array de registros.',
      });
    }

    if (p_dados.length === 0) {
      return res.status(400).json({
        error: 'A lista de registros da planilha está vazia.',
      });
    }

    const seenKeys = new Set<string>();
    const sanitizedData: any[] = [];

    for (let i = 0; i < p_dados.length; i++) {
      const item = p_dados[i];
      const rowNum = i + 1;

      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          error: `Registro #${rowNum} inválido na lista de dados.`,
        });
      }

      const modelo = typeof item.modelo === 'string' ? item.modelo.trim().toUpperCase() : '';
      const linha = typeof item.linha === 'string' ? item.linha.trim().toUpperCase() : '';

      if (!modelo) {
        return res.status(400).json({
          error: `Registro #${rowNum}: Campo "MODELO" é obrigatório e não pode estar vazio.`,
        });
      }

      if (!linha) {
        return res.status(400).json({
          error: `Registro #${rowNum} (Modelo: "${modelo}"): Campo "LINHA" é obrigatório e não pode estar vazio.`,
        });
      }

      const compositeKey = `${modelo}___${linha}`;
      if (seenKeys.has(compositeKey)) {
        return res.status(400).json({
          error: `Duplicidade detectada no servidor: Combinação de MODELO "${modelo}" e LINHA "${linha}" repetida na planilha.`,
        });
      }
      seenKeys.add(compositeKey);

      // Higieniza dados garantindo que valores vazios permaneçam null e números não sejam corrompidos
      sanitizedData.push({
        linha,
        modelo,
        potencia: item.potencia !== null && item.potencia !== undefined ? item.potencia : null,
        classe: item.classe ? String(item.classe).trim().toUpperCase() : null,
        meta_hora_hora_bt:
          typeof item.meta_hora_hora_bt === 'number' && !isNaN(item.meta_hora_hora_bt)
            ? item.meta_hora_hora_bt
            : null,
        meta_hora_hora_at:
          typeof item.meta_hora_hora_at === 'number' && !isNaN(item.meta_hora_hora_at)
            ? item.meta_hora_hora_at
            : null,
        meta_diaria_normal_bt:
          typeof item.meta_diaria_normal_bt === 'number' && !isNaN(item.meta_diaria_normal_bt)
            ? item.meta_diaria_normal_bt
            : null,
        meta_diaria_normal_at:
          typeof item.meta_diaria_normal_at === 'number' && !isNaN(item.meta_diaria_normal_at)
            ? item.meta_diaria_normal_at
            : null,
        meta_diaria_reduzida_bt:
          typeof item.meta_diaria_reduzida_bt === 'number' && !isNaN(item.meta_diaria_reduzida_bt)
            ? item.meta_diaria_reduzida_bt
            : null,
        meta_diaria_reduzida_at:
          typeof item.meta_diaria_reduzida_at === 'number' && !isNaN(item.meta_diaria_reduzida_at)
            ? item.meta_diaria_reduzida_at
            : null,
        tempo_padrao_bt:
          typeof item.tempo_padrao_bt === 'number' && !isNaN(item.tempo_padrao_bt)
            ? item.tempo_padrao_bt
            : null,
        tempo_padrao_at:
          typeof item.tempo_padrao_at === 'number' && !isNaN(item.tempo_padrao_at)
            ? item.tempo_padrao_at
            : null,
        espiras_baixa:
          typeof item.espiras_baixa === 'number' && !isNaN(item.espiras_baixa)
            ? item.espiras_baixa
            : null,
        espiras_alta:
          typeof item.espiras_alta === 'number' && !isNaN(item.espiras_alta)
            ? item.espiras_alta
            : null,
      });
    }

    // 3. Verificação de Credenciais do Supabase no Servidor
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl) {
      return res.status(503).json({
        error: 'SUPABASE_URL não configurada no servidor. Verifique as configurações de ambiente.',
      });
    }

    if (!supabaseSecretKey) {
      return res.status(503).json({
        error:
          'SUPABASE_SECRET_KEY (service_role) não está configurada no servidor. Por favor, adicione a chave de serviço SUPABASE_SECRET_KEY no painel de Secrets/Ambiente para autorizar a sincronização administrativa.',
        missingSecretKey: true,
      });
    }

    // 4. Execução da RPC no Supabase com service_role
    // O próprio backend fixa p_excluir_ausentes como true
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabaseAdmin.rpc('atualizar_base_bobinagem', {
      p_dados: sanitizedData,
      p_excluir_ausentes: true,
    });

    if (error) {
      console.error('[Admin Server] Erro ao executar atualizar_base_bobinagem:', error);
      return res.status(500).json({
        error: `Erro ao executar sincronização no banco: ${error.message || 'Falha na função SQL'}`,
        details: error,
      });
    }

    return res.json({
      success: true,
      data: data || {},
    });
  } catch (err: any) {
    console.error('[Admin Server] Exceção na rota /api/admin/atualizar-base:', err);
    return res.status(500).json({
      error: `Erro interno no servidor: ${err?.message || 'Falha inesperada'}`,
    });
  }
}
