/* ============================================================
   PASTANAGA · módulo Baja («Me quiero borrar»)
   El freno para el día que entran ganas de dejar el gym: antes de
   borrarse, enseña lo conseguido y propone algo más fácil que dejarlo.
   No borra nada ni da de baja en ningún sitio: solo hace pensar.
   Usa window.habitoResumen/habitoBajarPlan/habitoSemanaCasa (habito.js)
   y window.medidasResumen (medidas.js). Se apoya en esc() y render().

   Expone: window.bajaHTML(), window.bajaWire()
============================================================ */
(function(){
  let paso = null;   // null | "frenar" | "adios" | "hecho"
  let hecho = "";

  const fechaCorta = f => new Date(f+"T12:00:00").toLocaleDateString("es-ES", {day:"numeric", month:"short"});
  const fmt = v => v.toLocaleString("es-ES", {minimumFractionDigits:1, maximumFractionDigits:1});

  function logros(){
    const h = window.habitoResumen ? habitoResumen() : null;
    const m = window.medidasResumen ? (medidasResumen() || {}) : {};
    const filas = [];
    if(h && h.sesiones){
      filas.push(`<li>💪 <b>${h.sesiones}</b> ${h.sesiones===1?"sesión":"sesiones"} desde el ${fechaCorta(h.desde)}</li>`);
      filas.push(`<li>✅ <b>${h.cumplidas}</b> ${h.cumplidas===1?"semana cumplida":"semanas cumplidas"}</li>`);
      if(h.racha) filas.push(`<li>🔥 Racha de <b>${h.racha}</b> ${h.racha===1?"semana":"semanas"} que perderías</li>`);
    }
    for(const k of ["peso","cintura"]){
      const r = m[k];
      if(r && r.dif < 0) filas.push(`<li>📉 <b>${fmt(r.dif)} ${r.unidad}</b> de ${k} desde el ${fechaCorta(r.desde)}</li>`);
    }
    return filas;
  }

  window.bajaHTML = function(){
    const enlace = '<button id="bj-abrir" class="hb-link" style="display:block;margin:18px auto 0">😮‍💨 Me quiero borrar del gym</button>';
    if(!paso) return enlace;

    let hoja;
    if(paso === "frenar"){
      const fs = logros();
      hoja = `
        <h2 style="margin-bottom:6px">Antes de irte… 🥕</h2>
        ${fs.length
          ? `<p class="muted" style="margin-bottom:8px">Mira lo que llevas:</p><ul class="bj-logros">${fs.join("")}</ul>`
          : '<p class="muted" style="margin-bottom:8px">Aún no has empezado de verdad. Dale dos semanas antes de decidir.</p>'}
        <p style="margin:12px 0 10px;font-weight:700">Dejarlo del todo es lo único que seguro no funciona. Prueba antes una de estas:</p>
        <button class="btn sm" id="bj-1dia">🐢 Bajar a 1 día por semana</button>
        <button class="btn sec sm" id="bj-casa" style="margin-top:8px">🏠 Esta semana, en casa (20 min)</button>
        <button class="btn green sm" id="bj-sigo" style="margin-top:8px">💪 Me lo pienso, sigo</button>
        <button class="hb-link" id="bj-adios" style="display:block;margin:14px auto 0">Me borro igualmente</button>`;
    }else if(paso === "adios"){
      hoja = `
        <h2 style="margin-bottom:6px">Vale 🥕</h2>
        <p style="margin-bottom:8px">Tu racha, tus sesiones y tus datos se quedan aquí guardados. Si vuelves, seguimos donde lo dejaste.</p>
        <p class="muted" style="margin-bottom:14px">Un consejo: antes de darte de baja, espera una semana. Si sigues queriendo, adelante.</p>
        <button class="btn sec sm" id="bj-cerrar">Cerrar</button>`;
    }else{
      hoja = `
        <h2 style="margin-bottom:6px">Hecho 💪</h2>
        <p style="margin-bottom:14px">${hecho}</p>
        <button class="btn green sm" id="bj-cerrar">Seguimos</button>`;
    }
    return enlace + `<div class="overlay" id="bj-ov"><div class="sheet">${hoja}</div></div>`;
  };

  function cerrar(){ paso = null; render(); }

  window.bajaWire = function(){
    const on = (id, f) => { const e = document.getElementById(id); if(e) e.onclick = f; };
    on("bj-abrir", () => { paso = "frenar"; render(); });
    on("bj-sigo", cerrar);
    on("bj-cerrar", cerrar);
    on("bj-adios", () => { paso = "adios"; render(); });
    on("bj-1dia", async () => {
      if(window.habitoBajarPlan) await habitoBajarPlan();
      hecho = "Ahora tu plan es <b>1 día por semana</b>, y con ese día la semana cuenta. Cuando te apetezca, añade más con doble toque en «Mi semana».";
      paso = "hecho"; render();
    });
    on("bj-casa", async () => {
      if(window.habitoSemanaCasa) await habitoSemanaCasa();
      hecho = "Esta semana es <b>en casa</b>: 20 minutos de la rutina «En casa» y cuenta. La semana que viene, vuelta al gym.";
      paso = "hecho"; render();
    });
    const ov = document.getElementById("bj-ov");
    if(ov) ov.onclick = e => { if(e.target === ov) cerrar(); };
  };
})();
