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

async function subsDeUsuario(userId, env) {
  const r = await fetch(
    SB_URL + "/rest/v1/pastanaga_push?user_id=eq." + userId + "&select=subscription",
    { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_KEY } }
  );
  if (!r.ok) { console.log("Supabase fallo:", r.status); return []; }
  const filas = await r.json();
  console.log("Suscripciones encontradas para", userId, ":", filas.length);
  return filas.map(f => f.subscription);
}

async function enviarA(subscription, titulo, cuerpo) {
  const message = { data: JSON.stringify({ titulo, cuerpo }), options: { ttl: 120 } };
  const payload = await buildPushPayload(message, subscription, VAPID);
  const res = await fetch(subscription.endpoint, { method: "POST", headers: payload.headers, body: payload.body });
  const txt = await res.text().catch(() => "");
  console.log("Envio push ->", res.status, res.statusText, txt.slice(0, 200));
  return res.status;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return new Response("Worker de Pastanaga vivo 🥕", { headers: CORS });
    try {
      const body = await request.json();
      console.log("Recibido:", JSON.stringify({ user_id: body.user_id, titulo: body.titulo, tieneSubDirecta: !!body.subscription }));
      let subs = [];

      if (body.subscription) subs = [body.subscription];
      else if (body.user_id) subs = await subsDeUsuario(body.user_id, env);

      if (!subs.length) {
        console.log("Sin suscripciones para enviar");
        return new Response(JSON.stringify({ error: "sin suscripciones" }), { status: 404, headers: CORS });
      }

      const titulo = body.titulo || "Pastanaga 🥕";
      const cuerpo = body.cuerpo || "Tienes un aviso";
      const resultados = [];
      for (const s of subs) {
        try {
          const st = await enviarA(s, titulo, cuerpo);
          resultados.push(st);
        } catch (err) {
          console.log("Error enviando a un movil:", String(err));
          resultados.push(0);
        }
      }

      return new Response(JSON.stringify({ ok: true, enviados: resultados }), { headers: CORS });
    } catch (e) {
      console.log("Error general:", String(e));
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
    }
  },
};