/* ============================================================
   PASTANAGA · módulo Medidas («Mi barriga»)
   Autónomo, como habito.js: se apoya en sb, uid, vista, hoy(), esc()
   y render() de app.js. Usa su propia tabla, pastanaga_medidas
   (ver sql/medidas.sql), privada: cada uno solo ve las suyas.

   La idea: medir la cintura una vez por semana (el domingo) y ver
   cómo baja. El peso es opcional: al empezar a entrenar puede
   quedarse igual aunque la barriga baje, por eso manda la cintura.

   Expone: window.medidasHTML(), window.medidasWire()
============================================================ */
(function(){
  let medidas = null;       // [{fecha, cintura, peso}] de más antigua a más nueva
  let cargando = false, error = "", abierta = false, punto = null;

  const num = v => (v === null || v === undefined || v === "") ? null : Number(v);
  const fmt = (v, d=1) => v === null ? "—" : v.toLocaleString("es-ES", {minimumFractionDigits:d, maximumFractionDigits:d});
  const fechaCorta = f => new Date(f+"T12:00:00").toLocaleDateString("es-ES", {day:"numeric", month:"short"});
  const diasEntre = (a, b) => Math.round((new Date(b+"T12:00:00") - new Date(a+"T12:00:00")) / 86400000);

  async function cargar(){
    if(cargando) return;
    cargando = true; error = "";
    const {data, error:e} = await sb.from("pastanaga_medidas").select("fecha,cintura,peso").eq("user_id", uid).order("fecha");
    if(e) error = "Falta crear la tabla de medidas en Supabase (sql/medidas.sql)";
    medidas = (data||[]).map(m => ({fecha: m.fecha, cintura: num(m.cintura), peso: num(m.peso)}));
    cargando = false;
    if(vista === "gym") render();
  }

  // Gráfica de la cintura: una línea, sin leyenda (el título ya dice qué es)
  function grafica(ms){
    const W = 320, H = 120, pl = 34, pr = 10, pt = 12, pb = 22;
    const vals = ms.map(m => m.cintura);
    let min = Math.min(...vals), max = Math.max(...vals);
    if(max - min < 4){ const c = (max + min) / 2; min = c - 2; max = c + 2; }   // que 1 cm no parezca un precipicio
    const x = i => pl + (ms.length === 1 ? (W-pl-pr)/2 : i * (W-pl-pr) / (ms.length-1));
    const y = v => pt + (max - v) * (H-pt-pb) / (max - min);
    const linea = ms.map((m,i) => `${x(i).toFixed(1)},${y(m.cintura).toFixed(1)}`).join(" ");
    const sel = punto !== null && ms[punto] ? punto : ms.length - 1;
    return `
    <svg viewBox="0 0 ${W} ${H}" class="md-graf" role="img" aria-label="Cintura de ${fmt(vals[0])} a ${fmt(vals[vals.length-1])} cm">
      <line x1="${pl}" x2="${W-pr}" y1="${y(max)}" y2="${y(max)}" class="md-rej"/>
      <line x1="${pl}" x2="${W-pr}" y1="${y(min)}" y2="${y(min)}" class="md-rej"/>
      <text x="${pl-6}" y="${y(max)+4}" text-anchor="end" class="md-eje">${fmt(max,0)}</text>
      <text x="${pl-6}" y="${y(min)+4}" text-anchor="end" class="md-eje">${fmt(min,0)}</text>
      <text x="${x(0)}" y="${H-6}" text-anchor="start" class="md-eje">${fechaCorta(ms[0].fecha)}</text>
      ${ms.length > 1 ? `<text x="${x(ms.length-1)}" y="${H-6}" text-anchor="end" class="md-eje">${fechaCorta(ms[ms.length-1].fecha)}</text>` : ""}
      <polyline points="${linea}" class="md-linea"/>
      ${ms.map((m,i) => `<circle cx="${x(i)}" cy="${y(m.cintura)}" r="${i===sel?5:4}" class="md-punto ${i===sel?"sel":""}"/>`).join("")}
      ${ms.map((m,i) => `<rect data-mdp="${i}" x="${x(i)-14}" y="0" width="28" height="${H}" class="md-zona"><title>${fechaCorta(m.fecha)} · ${fmt(m.cintura)} cm</title></rect>`).join("")}
    </svg>
    <p class="muted md-info">${fechaCorta(ms[sel].fecha)} · <b>${fmt(ms[sel].cintura)} cm</b>${ms[sel].peso!==null ? " · "+fmt(ms[sel].peso)+" kg" : ""}</p>`;
  }

  window.medidasHTML = function(){
    if(medidas === null){ cargar(); return '<div class="card"><p class="muted">Cargando tus medidas…</p></div>'; }

    const conCintura = medidas.filter(m => m.cintura !== null);
    const ultima = medidas[medidas.length-1];
    const tocaMedir = !ultima || diasEntre(ultima.fecha, hoy()) >= 6;
    const primera = conCintura[0], ult = conCintura[conCintura.length-1];
    const dif = (primera && ult && conCintura.length > 1) ? ult.cintura - primera.cintura : null;

    let cuerpo;
    if(!conCintura.length){
      cuerpo = '<p class="muted" style="margin:4px 0 10px">Mide tu cintura hoy: será tu punto de partida. Luego, una vez por semana.</p>';
    }else{
      const frase = dif === null ? "Tu punto de partida. La próxima, en una semana."
        : dif < 0 ? `<b class="md-baja">${fmt(dif)} cm</b> desde el ${fechaCorta(primera.fecha)} 🔥`
        : dif === 0 ? `Igual que el ${fechaCorta(primera.fecha)}. Paciencia: la cintura baja despacio.`
        : `+${fmt(dif)} cm desde el ${fechaCorta(primera.fecha)}. Una semana mala no es la tendencia.`;
      cuerpo = `
        <div style="display:flex;align-items:baseline;gap:8px;margin-top:4px">
          <span class="md-hero">${fmt(ult.cintura)}</span><span class="muted">cm de cintura</span>
        </div>
        <p style="margin:2px 0 8px">${frase}</p>
        ${conCintura.length > 1 ? grafica(conCintura) : ""}`;
    }

    return `
    <div class="card md ${tocaMedir ? "md-toca" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2>📏 Mi barriga</h2>
        ${tocaMedir && conCintura.length ? '<span class="hb-racha">Toca medir</span>' : ""}
      </div>
      ${error ? '<div class="err" style="margin-top:8px">⚠ '+esc(error)+'</div>' : ""}
      ${cuerpo}
      <button class="btn ${tocaMedir ? "" : "sec"} sm" id="md-abrir" style="margin-top:8px">${tocaMedir ? "📏 Apuntar medidas" : "Corregir las de hoy"}</button>
    </div>
    ${abierta ? hojaMedir(ultima && ultima.fecha === hoy() ? ultima : null, ult) : ""}`;
  };

  function hojaMedir(deHoy, anterior){
    const c = deHoy && deHoy.cintura !== null ? deHoy.cintura : "";
    const p = deHoy && deHoy.peso !== null ? deHoy.peso : "";
    return `
    <div class="overlay" id="md-ov"><div class="sheet">
      <h2 style="margin-bottom:6px">📏 Medidas de hoy</h2>
      <p class="muted" style="margin-bottom:12px">Cinta métrica a la altura del ombligo, sin apretar, de pie y relajado. Mejor por la mañana, antes de desayunar.</p>
      <label style="font-weight:700">Cintura (cm)</label>
      <input type="number" inputmode="decimal" step="0.5" id="md-cintura" value="${c}" placeholder="${anterior ? fmt(anterior.cintura) : "ej. 95"}">
      <label style="font-weight:700;display:block;margin-top:10px">Peso (kg) <span class="muted">· opcional</span></label>
      <input type="number" inputmode="decimal" step="0.1" id="md-peso" value="${p}" placeholder="opcional">
      <div id="md-err"></div>
      <div class="row" style="margin-top:16px">
        <button class="btn green sm" id="md-ok">Guardar</button>
        <button class="btn sec sm" id="md-x">Cancelar</button>
      </div>
    </div></div>`;
  }

  async function guardar(){
    const cintura = parseFloat((document.getElementById("md-cintura").value||"").replace(",", "."));
    const pesoTxt = (document.getElementById("md-peso").value||"").replace(",", ".");
    const peso = pesoTxt ? parseFloat(pesoTxt) : null;
    const err = document.getElementById("md-err");
    if(!(cintura >= 40 && cintura <= 200)){ err.innerHTML = '<div class="err" style="margin-top:8px">Pon la cintura en cm (entre 40 y 200)</div>'; return; }
    if(peso !== null && !(peso >= 30 && peso <= 300)){ err.innerHTML = '<div class="err" style="margin-top:8px">El peso, en kg (entre 30 y 300)</div>'; return; }
    const {error:e} = await sb.from("pastanaga_medidas").upsert({user_id: uid, fecha: hoy(), cintura, peso});
    if(e){ err.innerHTML = '<div class="err" style="margin-top:8px">No se guardó: '+esc(e.message)+'</div>'; return; }
    abierta = false; punto = null; medidas = null;   // recargar
    render();
  }

  window.medidasWire = function(){
    const a = document.getElementById("md-abrir");
    if(a) a.onclick = () => { abierta = true; render(); };
    const ok = document.getElementById("md-ok"); if(ok) ok.onclick = guardar;
    const x = document.getElementById("md-x"); if(x) x.onclick = () => { abierta = false; render(); };
    const ov = document.getElementById("md-ov"); if(ov) ov.onclick = e => { if(e.target === ov){ abierta = false; render(); } };
    // tocar o pasar por un punto enseña su fecha y medida
    document.querySelectorAll("[data-mdp]").forEach(z => {
      const ver = () => { const i = parseInt(z.dataset.mdp); if(i !== punto){ punto = i; render(); } };
      z.onclick = ver; z.onmouseenter = ver;
    });
  };
})();
