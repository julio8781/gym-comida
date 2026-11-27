/* ============================================================
   PASTANAGA · módulo Medidas («Mis datos»)
   Autónomo, como habito.js: se apoya en sb, uid, vista, hoy(), esc()
   y render() de app.js. Usa su propia tabla, pastanaga_medidas
   (ver sql/medidas.sql). Los dos veis las de los dos; cada uno solo
   apunta las suyas.

   La idea: una vez por semana (el domingo) apuntar el peso y, si hay
   cinta métrica, la cintura, y ver cómo bajan. Las dos son opcionales,
   pero al menos una. Cada una tiene su gráfica (nunca las dos en la
   misma: tienen escalas distintas).

   Expone: window.medidasHTML(), window.medidasWire()
============================================================ */
(function(){
  const METRICAS = {
    peso:    { nombre: "Peso",    unidad: "kg", rango: [30, 300], paso: "0.1", eje: 2 },
    cintura: { nombre: "Cintura", unidad: "cm", rango: [40, 200], paso: "0.5", eje: 4 },
  };

  let medidas = null;       // [{fecha, cintura, peso}] de más antigua a más nueva
  let deQuien = null;       // de quién son las medidas cargadas
  let cargando = false, error = "", abierta = false, punto = null, metrica = null;

  const num = v => (v === null || v === undefined || v === "") ? null : Number(v);
  const fmt = (v, d=1) => v === null ? "—" : v.toLocaleString("es-ES", {minimumFractionDigits:d, maximumFractionDigits:d});
  const fechaCorta = f => new Date(f+"T12:00:00").toLocaleDateString("es-ES", {day:"numeric", month:"short"});
  const diasEntre = (a, b) => Math.round((new Date(b+"T12:00:00") - new Date(a+"T12:00:00")) / 86400000);
  const serie = k => (medidas||[]).filter(m => m[k] !== null);

  async function cargar(user){
    if(cargando) return;
    cargando = true; error = "";
    const {data, error:e} = await sb.from("pastanaga_medidas").select("fecha,cintura,peso").eq("user_id", user).order("fecha");
    deQuien = user;
    if(e) error = "Falta crear la tabla de medidas en Supabase (sql/medidas.sql)";
    medidas = (data||[]).map(m => ({fecha: m.fecha, cintura: num(m.cintura), peso: num(m.peso)}));
    cargando = false;
    if(vista === "gym") render();
  }

  // Gráfica de UNA medida: una línea, sin leyenda (el botón de arriba dice cuál es)
  function grafica(ms, k){
    const W = 320, H = 120, pl = 34, pr = 10, pt = 12, pb = 22, u = METRICAS[k].unidad;
    const vals = ms.map(m => m[k]);
    let min = Math.min(...vals), max = Math.max(...vals);
    const rangoMin = METRICAS[k].eje;              // que 1 kg o 1 cm no parezca un precipicio
    if(max - min < rangoMin){ const c = (max + min) / 2; min = c - rangoMin/2; max = c + rangoMin/2; }
    const x = i => pl + (ms.length === 1 ? (W-pl-pr)/2 : i * (W-pl-pr) / (ms.length-1));
    const y = v => pt + (max - v) * (H-pt-pb) / (max - min);
    const linea = ms.map((m,i) => `${x(i).toFixed(1)},${y(m[k]).toFixed(1)}`).join(" ");
    const sel = punto !== null && ms[punto] ? punto : ms.length - 1;
    return `
    <svg viewBox="0 0 ${W} ${H}" class="md-graf" role="img" aria-label="${METRICAS[k].nombre} de ${fmt(vals[0])} a ${fmt(vals[vals.length-1])} ${u}">
      <line x1="${pl}" x2="${W-pr}" y1="${y(max)}" y2="${y(max)}" class="md-rej"/>
      <line x1="${pl}" x2="${W-pr}" y1="${y(min)}" y2="${y(min)}" class="md-rej"/>
      <text x="${pl-6}" y="${y(max)+4}" text-anchor="end" class="md-eje">${fmt(max,0)}</text>
      <text x="${pl-6}" y="${y(min)+4}" text-anchor="end" class="md-eje">${fmt(min,0)}</text>
      <text x="${x(0)}" y="${H-6}" text-anchor="start" class="md-eje">${fechaCorta(ms[0].fecha)}</text>
      ${ms.length > 1 ? `<text x="${x(ms.length-1)}" y="${H-6}" text-anchor="end" class="md-eje">${fechaCorta(ms[ms.length-1].fecha)}</text>` : ""}
      <polyline points="${linea}" class="md-linea"/>
      ${ms.map((m,i) => `<circle cx="${x(i)}" cy="${y(m[k])}" r="${i===sel?5:4}" class="md-punto ${i===sel?"sel":""}"/>`).join("")}
      ${ms.map((m,i) => `<rect data-mdp="${i}" x="${x(i)-14}" y="0" width="28" height="${H}" class="md-zona"><title>${fechaCorta(m.fecha)} · ${fmt(m[k])} ${u}</title></rect>`).join("")}
    </svg>
    <p class="muted md-info">${fechaCorta(ms[sel].fecha)} · <b>${fmt(ms[sel][k])} ${u}</b></p>`;
  }

  // Número grande + cuánto ha cambiado desde la primera vez
  function bloque(k){
    const s = serie(k);
    if(!s.length) return "";
    const u = METRICAS[k].unidad, primera = s[0], ult = s[s.length-1];
    const dif = s.length > 1 ? Math.round((ult[k] - primera[k]) * 10) / 10 : null;
    const cambio = dif === null ? '<span class="muted">punto de partida</span>'
      : dif < 0 ? `<b class="md-baja">${fmt(dif)} ${u}</b> <span class="muted">desde el ${fechaCorta(primera.fecha)}</span>`
      : dif === 0 ? `<span class="muted">igual que el ${fechaCorta(primera.fecha)}</span>`
      : `<b>+${fmt(dif)} ${u}</b> <span class="muted">desde el ${fechaCorta(primera.fecha)}</span>`;
    return `
      <div class="md-bloque">
        <p class="muted md-et">${METRICAS[k].nombre}</p>
        <p><span class="md-hero">${fmt(ult[k])}</span> <span class="muted">${u}</span></p>
        <p class="md-cambio">${cambio}</p>
      </div>`;
  }

  // Para «Me quiero borrar»: cuánto ha bajado cada medida desde la primera
  window.medidasResumen = function(){
    if(!medidas || deQuien !== uid) return null;
    const r = {};
    for(const k of Object.keys(METRICAS)){
      const s = serie(k);
      if(s.length > 1) r[k] = {dif: Math.round((s[s.length-1][k] - s[0][k]) * 10) / 10, desde: s[0].fecha, unidad: METRICAS[k].unidad};
    }
    return r;
  };

  window.medidasHTML = function(){
    const user = gymUser || uid, mio = user === uid;
    if(medidas === null || deQuien !== user){ medidas = null; punto = null; cargar(user); return '<div class="card"><p class="muted">Cargando datos…</p></div>'; }
    const nombre = mio ? "" : esc(parejaPerfil ? parejaPerfil.nombre : "");

    const ultima = medidas[medidas.length-1];
    const tocaMedir = mio && (!ultima || diasEntre(ultima.fecha, hoy()) >= 6);
    const conGrafica = Object.keys(METRICAS).filter(k => serie(k).length > 1);
    if(!conGrafica.includes(metrica)) metrica = conGrafica[0] || null;

    // ¿Subió algo? Una frase para que una semana mala no hunda
    const subio = Object.keys(METRICAS).some(k => { const s = serie(k); return s.length > 1 && s[s.length-1][k] > s[s.length-2][k]; });

    const cuerpo = !medidas.length
      ? (mio ? '<p class="muted" style="margin:4px 0 10px">Pésate hoy (y mide la cintura si tienes cinta): será tu punto de partida. Luego, una vez por semana.</p>'
             : '<p class="muted" style="margin:4px 0 4px">Aún no ha apuntado nada.</p>')
      : `
        <div class="md-bloques">${bloque("peso")}${bloque("cintura")}</div>
        ${subio ? '<p class="muted" style="margin-top:4px;font-size:12px">Una semana mala no es la tendencia: mira la línea, no el último punto.</p>' : ""}
        ${conGrafica.length > 1 ? `
        <div class="seg" style="margin-top:10px">
          ${conGrafica.map(k => `<button data-mdm="${k}" class="${k===metrica?"on":""}" style="font-size:12px">${METRICAS[k].nombre}</button>`).join("")}
        </div>` : ""}
        ${metrica ? grafica(serie(metrica), metrica) : ""}`;

    return `
    <div class="card md ${tocaMedir ? "md-toca" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2>${mio ? "📊 Mis datos" : "📊 Datos de "+nombre}</h2>
        ${tocaMedir && medidas.length ? '<span class="hb-racha">Toca pesarse</span>' : ""}
      </div>
      ${error ? '<div class="err" style="margin-top:8px">⚠ '+esc(error)+'</div>' : ""}
      ${cuerpo}
      ${mio ? `<button class="btn ${tocaMedir ? "" : "sec"} sm" id="md-abrir" style="margin-top:8px">${tocaMedir ? "⚖️ Apuntar peso y medidas" : "Corregir las de hoy"}</button>` : ""}
    </div>
    ${abierta ? hojaMedir(ultima && ultima.fecha === hoy() ? ultima : null) : ""}`;
  };

  function hojaMedir(deHoy){
    const val = k => deHoy && deHoy[k] !== null ? deHoy[k] : "";
    const ultimo = k => { const s = serie(k); return s.length ? fmt(s[s.length-1][k]) : ""; };
    return `
    <div class="overlay" id="md-ov"><div class="sheet">
      <h2 style="margin-bottom:6px">⚖️ Hoy</h2>
      <p class="muted" style="margin-bottom:12px">Mejor siempre igual: por la mañana, después de ir al baño y antes de desayunar.</p>
      <label style="font-weight:700">Peso (kg)</label>
      <input type="number" inputmode="decimal" step="0.1" id="md-peso" value="${val("peso")}" placeholder="${ultimo("peso") || "ej. 85"}">
      <label style="font-weight:700;display:block;margin-top:10px">Cintura (cm) <span class="muted">· si tienes cinta</span></label>
      <input type="number" inputmode="decimal" step="0.5" id="md-cintura" value="${val("cintura")}" placeholder="${ultimo("cintura") || "opcional"}">
      <p class="muted" style="font-size:12px;margin-top:4px">A la altura del ombligo, sin apretar. Sin cinta: rodéate con un cordón, márcalo y mídelo con una regla o un metro.</p>
      <div id="md-err"></div>
      <div class="row" style="margin-top:16px">
        <button class="btn green sm" id="md-ok">Guardar</button>
        <button class="btn sec sm" id="md-x">Cancelar</button>
      </div>
    </div></div>`;
  }

  function leer(id, k){
    const t = (document.getElementById(id).value||"").replace(",", ".").trim();
    if(!t) return {v: null};
    const v = parseFloat(t), [a, b] = METRICAS[k].rango;
    return (v >= a && v <= b) ? {v} : {mal: `${METRICAS[k].nombre} en ${METRICAS[k].unidad}, entre ${a} y ${b}`};
  }

  async function guardar(){
    const err = document.getElementById("md-err");
    const p = leer("md-peso", "peso"), c = leer("md-cintura", "cintura");
    const mal = p.mal || c.mal || (p.v === null && c.v === null ? "Pon al menos el peso o la cintura" : "");
    if(mal){ err.innerHTML = '<div class="err" style="margin-top:8px">'+mal+'</div>'; return; }
    const {error:e} = await sb.from("pastanaga_medidas").upsert({user_id: uid, fecha: hoy(), cintura: c.v, peso: p.v});
    if(e){ err.innerHTML = '<div class="err" style="margin-top:8px">No se guardó: '+esc(e.message)+'</div>'; return; }
    abierta = false; punto = null; medidas = null; deQuien = null;   // recargar
    render();
  }

  window.medidasWire = function(){
    const a = document.getElementById("md-abrir");
    if(a) a.onclick = () => { abierta = true; render(); };
    const ok = document.getElementById("md-ok"); if(ok) ok.onclick = guardar;
    const x = document.getElementById("md-x"); if(x) x.onclick = () => { abierta = false; render(); };
    const ov = document.getElementById("md-ov"); if(ov) ov.onclick = e => { if(e.target === ov){ abierta = false; render(); } };
    document.querySelectorAll("[data-mdm]").forEach(b => b.onclick = () => { metrica = b.dataset.mdm; punto = null; render(); });
    // tocar o pasar por un punto enseña su fecha y medida
    document.querySelectorAll("[data-mdp]").forEach(z => {
      const ver = () => { const i = parseInt(z.dataset.mdp); if(i !== punto){ punto = i; render(); } };
      z.onclick = ver; z.onmouseenter = ver;
    });
  };
})();
