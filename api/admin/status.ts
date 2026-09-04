/**
 * Vercel Serverless Function
 * Mantém exatamente a mesma regra da rota GET /api/admin/status definida em server.ts.
 */
export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(404).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const secretKey = process.env.SUPABASE_SECRET_KEY || '';
  const adminPassword = process.env.ADMIN_UPDATE_PASSWORD || '';

  return res.json({
    supabaseUrlConfigured: Boolean(supabaseUrl),
    secretKeyConfigured: Boolean(secretKey),
    adminPasswordConfigured: Boolean(adminPassword),
  });
}
