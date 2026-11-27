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
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Lectura de Supabase con la llave de servicio (secreto SUPABASE_SERVICE_KEY)
async function sbGet(env, ruta) {
  const r = await fetch(SB_URL + "/rest/v1/" + ruta, {
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_KEY },
  });
  if (!r.ok) { console.log("Supabase fallo:", ruta.split("?")[0], r.status); return []; }
  return r.json();
}

async function subsDeUsuario(userId, env) {
  const filas = await sbGet(env, "pastanaga_push?user_id=eq." + encodeURIComponent(userId) + "&select=subscription");
  console.log("Suscripciones encontradas para", userId, ":", filas.length);
  return filas.map(f => f.subscription);
}

async function enviarA(subscription, titulo, cuerpo, tag) {
  const message = { data: JSON.stringify({ titulo, cuerpo, tag }), options: { ttl: 3600 } };
  const payload = await buildPushPayload(message, subscription, VAPID);
  const res = await fetch(subscription.endpoint, { method: "POST", headers: payload.headers, body: payload.body });
  const txt = await res.text().catch(() => "");
  console.log("Envio push ->", res.status, res.statusText, txt.slice(0, 200));
  return res.status;
}

async function avisarUsuario(env, userId, titulo, cuerpo, tag) {
  const subs = await subsDeUsuario(userId, env);
  const resultados = [];
  for (const s of subs) {
    try { resultados.push(await enviarA(s, titulo, cuerpo, tag)); }
    catch (err) { console.log("Error enviando a un movil:", String(err)); resultados.push(0); }
  }
  return resultados;
}

// ¿Quién llama? Solo se aceptan peticiones con la sesión de Supabase de alguien de la app.
async function usuarioDe(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const r = await fetch(SB_URL + "/auth/v1/user", {
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: auth },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u.id : null;
}

/* ============================================================
   AVISOS DEL GYM (tarea programada cada 15 min)
   Solo para quien usa la tarjeta «Mi semana» (tabla pastanaga_semanas).
   Misma lógica que habito.js:
   - semana de gym → los días elegidos (de serie L-X-V); cumplida con 2 sesiones
   - semana en casa → rutina D los días elegidos (de serie M y S); cumplida con 1
   - una sesión cuenta en cuanto hay UN ejercicio marcado
============================================================ */
const MINIMO = { gym: 2, casa: 1 };
const DIAS_DEF = { gym: [0, 2, 4], casa: [1, 5] };       // 0 = lunes (como habito.js)
const ROTACION = ["A", "B", "C"];
const NOMBRES_DEF = { A: "Full body 1", B: "Full body 2", C: "Cardio y brazos", D: "En casa" };

// Fecha y hora de Madrid (con su horario de verano), redondeada a 15 min
function ahoraMadrid(fecha = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(fecha).map(x => [x.type, x.value]));
  const hoy = `${p.year}-${p.month}-${p.day}`;
  const min = Math.floor(parseInt(p.minute) / 15) * 15;
  const hora = `${p.hour}:${String(min).padStart(2, "0")}`;
  const diaSemana = (new Date(hoy + "T12:00:00Z").getUTCDay() + 6) % 7;
  return { hoy, hora, diaSemana };
}
const addDias = (f, n) => { const d = new Date(f + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function fueAlGym(g) {
  if (g.registro?.ejercicios?.length) return g.registro.ejercicios.some(x => x.hecho);
  return Object.entries(g.hechos || {}).some(([k, v]) => v && k.startsWith(g.dia + "-"));
}

// Qué aviso toca a una persona en este momento (o null)
// Días de una semana: los suyos, si no los de la última semana del mismo tipo, si no los de serie
export function diasDe(filas, lunes, tipo) {
  const propia = filas.find(f => f.lunes === lunes);
  if (propia?.dias?.length) return [...propia.dias].sort((a, b) => a - b);
  const previas = filas.filter(f => f.lunes < lunes && f.dias?.length && ((f.semana_gym ?? f.roney_tarde) ? "gym" : "casa") === tipo)
    .sort((a, b) => (a.lunes < b.lunes ? 1 : -1));
  return previas.length ? [...previas[0].dias].sort((a, b) => a - b) : DIAS_DEF[tipo];
}

export function avisoPara({ hora, diaSemana, hoy }, semana, sesiones, nombres, dias, medidaReciente = true) {
  // Domingo por la mañana: medir la cintura (si no lo ha hecho en los últimos 6 días)
  if (diaSemana === 6 && hora === "11:00" && !medidaReciente)
    return { titulo: "⚖️ Toca pesarse", cuerpo: "Peso (y cintura si tienes cinta): 10 segundos y ves cómo vas.", tag: "gym-medidas" };

  // semana: true (gym) | false (casa) | undefined (sin elegir)
  const fueHoy = sesiones.includes(hoy);
  const n = sesiones.length;

  if (semana === undefined) {
    if (diaSemana === 0 && hora === "10:00")
      return { titulo: "¿Qué semana toca? 🥕", cuerpo: "Entra en Gym y elige: de gym o en casa.", tag: "gym-semana" };
    return null;
  }
  const tipo = semana ? "gym" : "casa";
  dias = dias || DIAS_DEF[tipo];
  const cumplida = n >= Math.max(1, Math.min(MINIMO[tipo], dias.length));
  const tocaHoy = dias.includes(diaSemana);

  if (tipo === "gym" && tocaHoy && !fueHoy) {
    const k = ROTACION[dias.indexOf(diaSemana) % ROTACION.length];
    if (hora === "18:00")
      return { titulo: `Hoy toca ${nombres[k] || NOMBRES_DEF[k]} 💪`, cuerpo: "~45 min y la semana sigue sumando.", tag: "gym-hoy" };
    if (hora === "21:15")
      return { titulo: "¿Has ido hoy? 🔥", cuerpo: "Márcalo en Gym para que cuente.", tag: "gym-hoy" };
  }
  if (tipo === "casa" && !cumplida && tocaHoy && !fueHoy && hora === "19:00")
    return { titulo: "Semana en casa 🏠", cuerpo: "20 min de la rutina «En casa» y la semana cuenta.", tag: "gym-casa" };

  if (diaSemana === 6 && hora === "20:00" && !cumplida)
    return { titulo: "Esta semana no ha salido", cuerpo: "Sin drama: el lunes empieza otra 💪", tag: "gym-semana" };

  return null;
}

async function avisosGym(env, fecha) {
  const ahora = ahoraMadrid(fecha);
  const lunes = addDias(ahora.hoy, -ahora.diaSemana);

  const todas = await sbGet(env, "pastanaga_semanas?select=*");
  const usuarios = [...new Set(todas.map(s => s.user_id))];
  if (!usuarios.length) return [];

  const [gyms, perfiles, medidas] = await Promise.all([
    sbGet(env, "pastanaga_gym?select=user_id,fecha,dia,hechos,registro&fecha=gte." + lunes + "&fecha=lte." + ahora.hoy),
    sbGet(env, "pastanaga_perfiles?select=user_id,rutina"),
    sbGet(env, "pastanaga_medidas?select=user_id&fecha=gte." + addDias(ahora.hoy, -6)),
  ]);

  const enviados = [];
  for (const u of usuarios) {
    const fila = todas.find(s => s.user_id === u && s.lunes === lunes);
    const semana = fila ? (fila.semana_gym ?? fila.roney_tarde) : undefined;
    const sesiones = gyms.filter(g => g.user_id === u && fueAlGym(g)).map(g => g.fecha);
    const nombres = perfiles.find(p => p.user_id === u)?.rutina?.nombres || {};
    const tipo = semana ? "gym" : "casa";
    const dias = diasDe(todas.filter(s => s.user_id === u), lunes, tipo);
    const medidaReciente = medidas.some(m => m.user_id === u);
    const aviso = avisoPara(ahora, semana, sesiones, nombres, dias, medidaReciente);
    if (!aviso) continue;
    console.log("Aviso gym", ahora.hoy, ahora.hora, u, aviso.titulo);
    await avisarUsuario(env, u, aviso.titulo, aviso.cuerpo, aviso.tag);
    enviados.push({ u, titulo: aviso.titulo });
  }
  return enviados;
}

/* ============================================================
   RESUMEN PARA SOFI (GET /sofi, cabecera X-Sofi-Clave = secreto SOFI_CLAVE)
   Solo lectura: lo de hoy, la semana, la racha, las calorías y el peso de
   cada persona de la app. Misma lógica que habito.js y medidas.js.
============================================================ */
const ROTACION_NOMBRES = { A: "Full body 1", B: "Full body 2", C: "Cardio y brazos", D: "En casa" };

function resumenGym(filas, sesiones, ahora, nombres) {
  const semanaDe = lunes => {
    const fila = filas.find(f => f.lunes === lunes);
    const gym = fila ? (fila.semana_gym ?? fila.roney_tarde) : undefined;
    const tipo = gym ? "gym" : "casa";
    const dias = diasDe(filas, lunes, tipo);
    let n = 0;
    for (let i = 0; i < 7; i++) if (sesiones.has(addDias(lunes, i))) n++;
    const minimo = Math.max(1, Math.min(MINIMO[tipo], dias.length));
    return { gym, tipo, dias, n, minimo, cumplida: n >= minimo };
  };
  const lunes = addDias(ahora.hoy, -ahora.diaSemana);
  const w = semanaDe(lunes);
  // racha de semanas cumplidas (la de ahora suma si ya está cumplida, si no no rompe)
  let racha = w.cumplida ? 1 : 0, l = addDias(lunes, -7);
  for (let i = 0; i < 104 && semanaDe(l).cumplida; i++) { racha++; l = addDias(l, -7); }
  let rutina = null;
  if (w.gym !== undefined && w.dias.includes(ahora.diaSemana))
    rutina = w.tipo === "casa" ? "D" : ROTACION[w.dias.indexOf(ahora.diaSemana) % ROTACION.length];
  return {
    semana_elegida: w.gym !== undefined,
    tipo: w.tipo, dias: w.dias, hechas: w.n, minimo: w.minimo, cumplida: w.cumplida, racha,
    hoy: { toca: !!rutina, rutina: rutina ? (nombres[rutina] || ROTACION_NOMBRES[rutina]) : null, ya_fue: sesiones.has(ahora.hoy) },
  };
}

function resumenMedida(ms, k) {
  const s = ms.filter(m => m[k] !== null && m[k] !== undefined).map(m => ({ fecha: m.fecha, v: Number(m[k]) }));
  if (!s.length) return null;
  const ult = s[s.length - 1];
  return { ultimo: ult.v, fecha: ult.fecha, desde: s[0].fecha, cambio: Math.round((ult.v - s[0].v) * 10) / 10, medidas: s.length };
}

async function resumenParaSofi(env) {
  const ahora = ahoraMadrid();
  const hace = addDias(ahora.hoy, -7 * 105);
  const [perfiles, semanas, gyms, comidas, medidas] = await Promise.all([
    sbGet(env, "pastanaga_perfiles?select=user_id,nombre,objetivo,peso,rutina"),
    sbGet(env, "pastanaga_semanas?select=*"),
    sbGet(env, "pastanaga_gym?select=user_id,fecha,dia,hechos,registro&fecha=gte." + hace),
    sbGet(env, "pastanaga_comidas?select=user_id,kcal,proteina,borrada&fecha=eq." + ahora.hoy),
    sbGet(env, "pastanaga_medidas?select=user_id,fecha,cintura,peso&order=fecha"),
  ]);
  const personas = perfiles.map(p => {
    const u = p.user_id;
    const sesiones = new Set(gyms.filter(g => g.user_id === u && fueAlGym(g)).map(g => g.fecha));
    const hoyCom = comidas.filter(c => c.user_id === u && !c.borrada);
    const kcal = Math.round(hoyCom.reduce((a, c) => a + (c.kcal || 0), 0));
    const prot = Math.round(hoyCom.reduce((a, c) => a + (c.proteina || 0), 0));
    const protObj = Math.round((p.peso || 0) * 1.6);
    const ms = medidas.filter(m => m.user_id === u);
    return {
      nombre: p.nombre,
      gym: resumenGym(semanas.filter(s => s.user_id === u), sesiones, ahora, p.rutina?.nombres || {}),
      comida: { objetivo: p.objetivo || 0, comido: kcal, quedan: Math.max(0, (p.objetivo || 0) - kcal), apuntadas: hoyCom.length,
                proteina: { objetivo: protObj, comido: prot, quedan: Math.max(0, protObj - prot) } },
      peso: resumenMedida(ms, "peso"),
      cintura: resumenMedida(ms, "cintura"),
    };
  });
  return { hoy: ahora.hoy, personas };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method === "GET" && new URL(request.url).pathname === "/sofi") {
      if (!env.SOFI_CLAVE || request.headers.get("X-Sofi-Clave") !== env.SOFI_CLAVE) return json({ error: "clave" }, 401);
      try { return json(await resumenParaSofi(env)); }
      catch (e) { console.log("Error resumen Sofi:", String(e)); return json({ error: String(e) }, 500); }
    }
    if (request.method !== "POST") return new Response("Worker de Pastanaga vivo 🥕", { headers: CORS });
    try {
      // Antes cualquiera podía mandar avisos a cualquiera; ahora hay que haber iniciado sesión
      const quien = await usuarioDe(request, env);
      if (!quien) return json({ error: "sin sesion" }, 401);

      const body = await request.json();
      console.log("Recibido de", quien, JSON.stringify({ user_id: body.user_id, titulo: body.titulo, tieneSubDirecta: !!body.subscription }));

      const titulo = body.titulo || "Pastanaga 🥕";
      const cuerpo = body.cuerpo || "Tienes un aviso";
      let resultados = [];
      if (body.subscription) {
        resultados = [await enviarA(body.subscription, titulo, cuerpo)];
      } else if (body.user_id) {
        resultados = await avisarUsuario(env, body.user_id, titulo, cuerpo);
      }
      if (!resultados.length) {
        console.log("Sin suscripciones para enviar");
        return json({ error: "sin suscripciones" }, 404);
      }
      return json({ ok: true, enviados: resultados });
    } catch (e) {
      console.log("Error general:", String(e));
      return json({ error: String(e) }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(avisosGym(env, new Date(event.scheduledTime)).catch(e => console.log("Error avisos gym:", String(e))));
  },
};
