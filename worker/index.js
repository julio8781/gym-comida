import { buildPushPayload } from "@block65/webcrypto-web-push";

const VAPID = {
  subject: "mailto:julio@pastanaga.app",
  publicKey: "BPvEbZLMuW8WCz_PtPLjbbflzg-W_pTcsMOiXKn50hcywto_SAWEKtPZOOFdIfZl9duxgVL97GqfbRDkl-67ZD0",
  privateKey: "WoT_1vyi0v32CPocgL8tx9nt9YlsHwULDTAY7vw-7gc",
};
const SB_URL = "https://kepdacdtqffhkhaswqsk.supabase.co";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Busca las suscripciones de un usuario en Supabase (puede tener varias: varios moviles)
async function subsDeUsuario(userId, env) {
  const r = await fetch(
    SB_URL + "/rest/v1/pastanaga_push?user_id=eq." + userId + "&select=subscription",
    { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_KEY } }
  );
  if (!r.ok) return [];
  const filas = await r.json();
  return filas.map(f => f.subscription);
}

async function enviarA(subscription, titulo, cuerpo) {
  const message = { data: JSON.stringify({ titulo, cuerpo }), options: { ttl: 120 } };
  const payload = await buildPushPayload(message, subscription, VAPID);
  return fetch(subscription.endpoint, { method: "POST", headers: payload.headers, body: payload.body });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return new Response("Worker de Pastanaga vivo 🥕", { headers: CORS });
    try {
      const body = await request.json();
      let subs = [];

      // Modo 1: me pasan una suscripcion directa (prueba de Fase 1)
      if (body.subscription) subs = [body.subscription];
      // Modo 2: me pasan un user_id -> busco sus suscripciones en Supabase
      else if (body.user_id) subs = await subsDeUsuario(body.user_id, env);

      if (!subs.length) return new Response(JSON.stringify({ error: "sin suscripciones" }), { status: 404, headers: CORS });

      const titulo = body.titulo || "Pastanaga 🥕";
      const cuerpo = body.cuerpo || "Tienes un aviso";
      const resultados = await Promise.all(subs.map(s => enviarA(s, titulo, cuerpo).then(r => r.status).catch(() => 0)));

      return new Response(JSON.stringify({ ok: true, enviados: resultados }), { headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
    }
  },
};
