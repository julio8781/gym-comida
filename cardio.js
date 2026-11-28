/* ============================================================
   PASTANAGA · módulo Cardio
   Autónomo, como medidas.js: se apoya en sesionG, guardarSesion(),
   gemini(), pedirImagen(), perfil, parejaPerfil, gymUser, uid, esc()
   y render() de app.js.

   Dentro de la sesión del gym, un bloque CARDIO: cinta, bici o
   elíptica, con minutos, velocidad e inclinación. Se apunta a mano
   o con una 📷 foto de la pantalla de la máquina (Gemini la lee y
   pasa las millas a km).

   Se guarda dentro de registro.cardio (la columna jsonb de
   pastanaga_gym): no hace falta SQL nuevo.

   Las calorías las calcula Pastanaga con el peso real (fórmulas del
   ACSM, las de los libros de fisiología) y son las NETAS: lo gastado
   de más respecto a estar sentado. La máquina da las brutas y con un
   peso de serie, así que suele dar algo más.

   Expone: window.cardioHTML(mio), window.cardioWire()
============================================================ */
(function(){
  const MAQUINAS = {
    cinta:    { nombre: "Cinta",    icono: "🚶" },
    bici:     { nombre: "Bici",     icono: "🚴" },
    eliptica: { nombre: "Elíptica", icono: "🏃" },
  };
  const MPH = 1.609344;

  let abierto = false, leyendo = false, error = "";
  let borrador = null;   // lo que se está apuntando (de la foto o a mano)

  const fmt = (v, d=1) => Number(v).toLocaleString("es-ES", {minimumFractionDigits:0, maximumFractionDigits:d});
  const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? null : n; };

  function pesoDe(mio){
    const p = mio ? perfil : parejaPerfil;
    return (p && p.peso) || 80;
  }

  // kcal netas. Cinta: ACSM (andar hasta ~6,5 km/h, correr por encima).
  // Bici y elíptica: MET moderado (sin vatios de la máquina no hay más precisión).
  function kcalNetas(c, kg){
    const min = c.min || 0;
    if(!min) return 0;
    if(c.maquina === "cinta"){
      const mmin = (c.kmh || 0) * 1000 / 60;          // metros por minuto
      const pend = (c.incl || 0) / 100;
      const corre = c.kmh > 6.5;
      const vo2 = corre ? 0.2*mmin + 0.9*mmin*pend : 0.1*mmin + 1.8*mmin*pend;  // sin los 3,5 de reposo
      return Math.round(vo2 * kg / 1000 * 5 * min);
    }
    const metNeto = c.maquina === "bici" ? 4.8 : 4;   // MET 5,8 / 5 menos el de estar sentado
    return Math.round(metNeto * 3.5 * kg / 200 * min);
  }
  function completar(c, kg){
    if(c.maquina === "cinta" && c.kmh && c.min && !c.km) c.km = +(c.kmh * c.min / 60).toFixed(2);
    c.kcal = kcalNetas(c, kg);
    return c;
  }

  const P_PANTALLA = 'Es la foto de la pantalla de una máquina de cardio de gimnasio (cinta, bici estática o elíptica). Lee los números. ' +
    'Devuelve SOLO JSON válido sin markdown: {"maquina":"cinta|bici|eliptica","minutos":0,"segundos":0,"velocidad":0,"unidad_velocidad":"mph|kmh",' +
    '"distancia":0,"unidad_distancia":"mi|km","inclinacion":0,"kcal":0,"pulso":0}. ' +
    'minutos y segundos = el tiempo que lleva entrenando (el número grande tipo 05:30), NO el ritmo (min/mi) ni el tiempo restante. ' +
    'Si pone "mph" o "mi" son millas. inclinacion = el % de cuesta (icono de barritas). pulso 0 si no hay. ' +
    'Si un número no se ve, pon 0. Si no es una máquina de cardio: {"maquina":""}';

  async function leerFoto(b64){
    leyendo = true; error = ""; abierto = true; render();
    try{
      const r = await gemini([{inline_data:{mime_type:"image/jpeg", data:b64}}, {text:P_PANTALLA}]);
      if(!r || !MAQUINAS[r.maquina]) throw new Error("No veo la pantalla de una máquina de cardio en esa foto");
      const millas = r.unidad_velocidad === "mph" || r.unidad_distancia === "mi";
      const kmh = r.velocidad ? (r.unidad_velocidad === "mph" ? r.velocidad*MPH : r.velocidad) : null;
      const km  = r.distancia ? (r.unidad_distancia === "mi" ? r.distancia*MPH : r.distancia) : null;
      borrador = {
        maquina: r.maquina,
        min: Math.round(((r.minutos||0) + (r.segundos||0)/60) * 10) / 10 || null,
        kmh: kmh ? +kmh.toFixed(1) : null,
        incl: r.inclinacion || 0,
        km: km ? +km.toFixed(2) : null,
        kcalMaquina: r.kcal || null,
        pulso: r.pulso || null,
        foto: true, millas,
      };
    }catch(e){
      error = e.message || "No se pudo leer la foto";
    }
    leyendo = false; render();
  }

  function formHTML(){
    const b = borrador || {maquina:"cinta", min:"", kmh:"", incl:0};
    const cinta = b.maquina === "cinta";
    return `
    <div class="cd-form">
      ${b.foto ? `<p class="muted" style="margin-bottom:8px">📷 Leído de la foto${b.millas?" (pasado de millas a km)":""}. Revisa que esté bien y guarda.</p>` : ""}
      <div class="seg" style="margin-bottom:10px">
        ${Object.entries(MAQUINAS).map(([k,m])=>`<button data-cd-maq="${k}" class="${b.maquina===k?"on":""}" style="font-size:12px">${m.icono} ${m.nombre}</button>`).join("")}
      </div>
      <div class="cd-campos">
        <label>Minutos<input type="number" inputmode="decimal" id="cd-min" value="${b.min??""}" placeholder="30"></label>
        ${cinta ? `
        <label>Velocidad (km/h)<input type="number" inputmode="decimal" step="0.1" id="cd-kmh" value="${b.kmh??""}" placeholder="5,5"></label>
        <label>Inclinación (%)<input type="number" inputmode="decimal" step="0.5" id="cd-incl" value="${b.incl??0}" placeholder="10"></label>` : ""}
      </div>
      ${b.kcalMaquina ? `<p class="muted" style="margin-top:8px">La máquina decía ${fmt(b.kcalMaquina,0)} kcal${b.pulso?" · pulso "+b.pulso:""}</p>` : ""}
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn green sm" id="cd-guardar">Guardar</button>
        <button class="btn sec sm" id="cd-cancelar">Cancelar</button>
      </div>
    </div>`;
  }

  function filaHTML(c, i, mio){
    const m = MAQUINAS[c.maquina] || MAQUINAS.cinta;
    const partes = [fmt(c.min) + " min"];
    if(c.kmh) partes.push(fmt(c.kmh) + " km/h");
    if(c.incl) partes.push("cuesta " + fmt(c.incl) + " %");
    if(c.km) partes.push(fmt(c.km, 2) + " km");
    return `
    <div class="cd-fila">
      <div class="cd-ico">${m.icono}</div>
      <div style="flex:1">
        <p class="nm">${m.nombre}${c.foto?' <span class="muted" style="font-weight:600">📷</span>':""}</p>
        <p class="muted">${partes.join(" · ")}</p>
      </div>
      <div class="cd-kcal"><b>~${c.kcal}</b><span>kcal</span></div>
      ${mio ? `<button class="cd-x" data-cd-quitar="${i}" title="Quitar">✕</button>` : ""}
    </div>`;
  }

  window.cardioHTML = function(mio){
    const reg = sesionG && sesionG.registro;
    if(!reg) return "";
    const lista = reg.cardio || [];
    if(!mio && !lista.length) return "";
    const total = lista.reduce((s,c)=>s+(c.kcal||0), 0);
    const minutos = lista.reduce((s,c)=>s+(c.min||0), 0);
    return `
    <div class="card cd">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2>🏃 Cardio</h2>
        ${lista.length ? `<span class="muted" style="font-weight:700">${fmt(minutos)} min · ~${total} kcal</span>` : ""}
      </div>
      ${lista.map((c,i)=>filaHTML(c,i,mio)).join("")}
      ${error ? `<div class="err" style="margin-top:8px">⚠ ${esc(error)}</div>` : ""}
      ${leyendo ? '<p class="muted" style="margin-top:10px">📷 Leyendo la pantalla…</p>' : ""}
      ${mio && abierto && !leyendo ? formHTML() : ""}
      ${mio && !abierto && !leyendo ? `
      <div style="display:flex;gap:8px;margin-top:${lista.length?10:8}px">
        <button class="btn sm" id="cd-foto">📷 Foto de la pantalla</button>
        <button class="btn sec sm" id="cd-mano">✏️ A mano</button>
      </div>` : ""}
      ${lista.length ? `<p class="muted" style="margin-top:8px;font-size:12px">Calculadas con ${fmt(pesoDe(mio))} kg: lo gastado de más respecto a estar sentado. No las sumes a lo que puedes comer.</p>` : ""}
    </div>`;
  };

  window.cardioWire = function(){
    const $ = id => document.getElementById(id);
    if($("cd-foto")) $("cd-foto").onclick = ()=>{
      if(!perfil.apikey){ error = "Falta la clave de Gemini en Ajustes ⚙️"; render(); return; }
      pedirImagen(leerFoto);
    };
    if($("cd-mano")) $("cd-mano").onclick = ()=>{ borrador = null; error = ""; abierto = true; render(); };
    if($("cd-cancelar")) $("cd-cancelar").onclick = ()=>{ borrador = null; abierto = false; error = ""; render(); };
    document.querySelectorAll("[data-cd-maq]").forEach(b=>b.onclick = ()=>{
      borrador = Object.assign(borrador || {}, leerForm(), {maquina: b.dataset.cdMaq});
      render();
    });
    if($("cd-guardar")) $("cd-guardar").onclick = async ()=>{
      const c = Object.assign({}, borrador || {maquina:"cinta"}, leerForm());
      if(!c.min || c.min <= 0 || c.min > 300){ error = "Pon los minutos"; render(); return; }
      if(c.maquina === "cinta" && (!c.kmh || c.kmh > 25)){ error = "Pon la velocidad en km/h"; render(); return; }
      if(c.maquina !== "cinta"){ delete c.kmh; delete c.incl; delete c.km; }
      delete c.millas;
      completar(c, pesoDe(true));
      sesionG.registro.cardio = (sesionG.registro.cardio || []).concat([c]);
      borrador = null; abierto = false; error = "";
      await guardarSesion(); render();
    };
    document.querySelectorAll("[data-cd-quitar]").forEach(b=>b.onclick = async ()=>{
      if(!confirm("¿Quitar este cardio?")) return;
      sesionG.registro.cardio.splice(parseInt(b.dataset.cdQuitar), 1);
      await guardarSesion(); render();
    });
  };

  function leerForm(){
    const v = id => { const el = document.getElementById(id); return el ? num(el.value) : undefined; };
    const r = {};
    const min = v("cd-min"), kmh = v("cd-kmh"), incl = v("cd-incl");
    if(min !== undefined) r.min = min;
    if(kmh !== undefined){
      // Si ha cambiado la velocidad a mano, la distancia de la foto ya no vale
      if(borrador && borrador.kmh !== kmh) r.km = null;
      r.kmh = kmh;
    }
    if(incl !== undefined) r.incl = incl || 0;
    if(borrador && min !== undefined && borrador.min !== min && !r.hasOwnProperty("km")) r.km = null;
    return r;
  }

  // Para probarlo desde la consola o un test
  window._cardioKcal = kcalNetas;
})();
