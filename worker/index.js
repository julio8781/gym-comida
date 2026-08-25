import { buildPushPayload } from "@block65/webcrypto-web-push";

const VAPID = {
  subject: "mailto:julio@pastanaga.app",
  publicKey: "BPvEbZLMuW8WCz_PtPLjbbflzg-W_pTcsMOiXKn50hcywto_SAWEKtPZOOFdIfZl9duxgVL97GqfbRDkl-67ZD0",
  privateKey: "WoT_1vyi0v32CPocgL8tx9nt9YlsHwULDTAY7vw-7gc",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return new Response("Worker de Pastanaga vivo 🥕", { headers: CORS });
    try {
      const { subscription } = await request.json();
      if (!subscription) return new Response(JSON.stringify({ error: "falta subscription" }), { status: 400, headers: CORS });

      const message = {
        data: JSON.stringify({ titulo: "Pastanaga 🥕", cuerpo: "¡Funciona! Este es tu primer push." }),
        options: { ttl: 60 },
      };

      const payload = await buildPushPayload(message, subscription, VAPID);
      const res = await fetch(subscription.endpoint, {
        method: "POST",
        headers: payload.headers,
        body: payload.body,
      });

      return new Response(JSON.stringify({ ok: res.ok, status: res.status }), { headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
    }
  },
};
