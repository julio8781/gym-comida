/* ============================================================
   PASTANAGA · módulo Logros (fin de sesión, logros y colección)
   Autónomo, como cardio.js: se apoya en sb, uid, gymUser, fechaGym,
   sesionG, perfil, parejaPerfil, BIB, nombreRutina, sesionTerminada,
   avisar(), esc(), hoy(), addDias(), vista y render() de app.js.

   - Al terminar la sesión (todo hecho o saltado): tarjeta arriba con
     el número de sesión, el peso movido, series, cardio, lo que has
     mejorado respecto a la última vez de esa rutina y la próxima.
   - Cada sesión terminada abre un «sobre» con una tarjeta de la
     colección (verduras del gym, con rarezas). Sale siempre la misma
     para ese día y esa persona: no se guarda nada, se calcula.
   - Logros: también se calculan del historial de pastanaga_gym.
   - Aviso a la pareja por notificación del móvil (NO por Sofi: Sofi
     está en casa y hablaría sola).

   Sin SQL nuevo. Expone: finHTML(mio), finWire(), finAlTerminar(),
   coleccionBotonHTML(), logrosRefrescar()
============================================================ */
(function(){
  // ---------- La colección ----------
  const RAREZAS = {
    comun:      { nombre: "Común",      peso: 62 },
    rara:       { nombre: "Rara",       peso: 28 },
    epica:      { nombre: "Épica",      peso: 8 },
    legendaria: { nombre: "Legendaria", peso: 2 },
  };
  const BARAJA = [
    ["zanahoria", "🥕", "Zanahoria Novata",   "comun", "Todos empezamos por algún sitio"],
    ["pepino",    "🥒", "Pepino Fresco",      "comun", "Ni el frío le para"],
    ["tomate",    "🍅", "Tomate Sudado",      "comun", "Rojo de esfuerzo, no de vergüenza"],
    ["patata",    "🥔", "Patata Tenaz",       "comun", "Dura por fuera, constante por dentro"],
    ["cebolla",   "🧅", "Cebolla Llorona",    "comun", "Llora, pero no se rinde"],
    ["mazorca",   "🌽", "Mazorca Constante",  "comun", "Grano a grano"],
    ["berenjena", "🍆", "Berenjena Elástica", "comun", "Estira siempre al acabar"],
    ["lechuga",   "🥬", "Lechuga Ligera",     "comun", "Cada vez pesa menos"],
    ["pimiento",  "🫑", "Pimiento Picante",   "comun", "Le pone salsa a cada serie"],
    ["champi",    "🍄", "Champi Trasnochador","comun", "Entrena cuando los demás duermen"],
    ["brocoli",   "🥦", "Brócoli Culturista", "rara", "Árbol pequeño, brazos grandes"],
    ["aguacate",  "🥑", "Aguacate Sano",      "rara", "Grasas buenas, actitud mejor"],
    ["limon",     "🍋", "Limón Intervalos",   "rara", "Ácido en cada sprint"],
    ["guisante",  "🫛", "Guisante Velocista", "rara", "Pequeño y rapidísimo"],
    ["boniato",   "🍠", "Boniato Potente",    "rara", "Energía lenta, fuerza larga"],
    ["ajo",       "🧄", "Ajo Invencible",     "rara", "Nadie se le acerca en la prensa"],
    ["sandia",    "🍉", "Sandía Hidratada",   "rara", "Bebe agua entre series"],
    ["coco",      "🥥", "Coco Duro",          "rara", "Cáscara de acero"],
    ["guindilla", "🌶️", "Guindilla de Fuego", "epica", "Quema barriga solo con mirarla"],
    ["pina",      "🍍", "Piña Blindada",      "epica", "Armadura de abdominales"],
    ["jengibre",  "🫚", "Jengibre Turbo",     "epica", "Metabolismo a tope"],
    ["fresa",     "🍓", "Fresa Imparable",    "epica", "Una más, siempre una más"],
    ["dorada",    "👑", "Zanahoria Dorada",   "legendaria", "La leyenda de Pastanaga"],
    ["conejo",    "🐇", "Conejo del Gym",     "legendaria", "Persigue zanahorias y récords"],
  ].map(([id, ico, n, r, frase]) => ({id, ico, n, r, frase}));

  // Número fijo a partir de un texto (la misma persona y el mismo día → la misma tarjeta)
  function semilla(txt){
    let h = 2166136261;
    for(const c of txt){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function tarjetaDe(user, fecha){
    const s = semilla(user + "|" + fecha);
    const total = Object.values(RAREZAS).reduce((a,r)=>a+r.peso, 0);
    let tirada = s % total, rareza = "comun";
    for(const [k, r] of Object.entries(RAREZAS)){ if(tirada < r.peso){ rareza = k; break; } tirada -= r.peso; }
    const posibles = BARAJA.filter(c => c.r === rareza);
    return posibles[Math.floor(s / 7) % posibles.length];
  }

  // ---------- Cuentas de una sesión ----------
  const PIERNA = ["prensa","sentadilla","sentadilla_goblet","zancadas","peso_muerto","sentadilla_aire"];
  const numero = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? 0 : n; };
  function seriesDeEj(x){
    const m = /^(\d+)\s*×/.exec((BIB[x.id] || {}).s || "");
    return numero(x.series) || (m ? parseInt(m[1]) : 0);
  }
  function repsDeEj(x){
    const m = /×\s*(\d+)/.exec((BIB[x.id] || {}).s || "");
    return m && !/seg|min/.test((BIB[x.id] || {}).s) ? parseInt(m[1]) : 0;
  }
  function cuentas(g){
    const r = g.registro || {};
    const ejs = (r.ejercicios || []).filter(x => x.hecho);
    let kg = 0, series = 0;
    for(const x of ejs){
      const s = seriesDeEj(x);
      series += s;
      kg += s * repsDeEj(x) * numero(x.kg);
    }
    const cardio = r.cardio || [];
    return {
      kg: Math.round(kg), series,
      cardioMin: cardio.reduce((a,c)=>a+(c.min||0), 0),
      cardioKm: cardio.reduce((a,c)=>a+(c.km||0), 0),
      cuestaMin: cardio.filter(c=>c.maquina==="cinta" && (c.incl||0) >= 5).reduce((a,c)=>a+(c.min||0), 0),
      kcalCardio: cardio.reduce((a,c)=>a+(c.kcal||0), 0),
      pierna: ejs.some(x => PIERNA.includes(x.id)),
    };
  }
  const terminadaG = g => g.registro && g.registro.ejercicios && g.registro.ejercicios.length
    ? sesionTerminada(g.registro)
    : Object.entries(g.hechos || {}).filter(([k,v]) => v && k.startsWith(g.dia + "-")).length >= 5;

  // ---------- Logros ----------
  const LOGROS = [
    {id:"primera", ico:"🥇", n:"Día 1",              d:"Terminar tu primera sesión"},
    {id:"s5",      ico:"🖐️", n:"Cinco",              d:"5 sesiones terminadas"},
    {id:"s10",     ico:"🔟", n:"Diez",               d:"10 sesiones terminadas"},
    {id:"s25",     ico:"🏅", n:"Veinticinco",        d:"25 sesiones terminadas"},
    {id:"s50",     ico:"🏆", n:"Cincuenta",          d:"50 sesiones terminadas"},
    {id:"semana",  ico:"📅", n:"Semana completa",    d:"2 sesiones en la misma semana"},
    {id:"racha4",  ico:"🔥", n:"Un mes sin fallar",  d:"4 semanas seguidas entrenando"},
    {id:"sube",    ico:"📈", n:"Más fuerte",         d:"Subir los kg de un ejercicio"},
    {id:"elefante",ico:"🐘", n:"Elefante",           d:"Mover 10.000 kg en una sesión"},
    {id:"grua",    ico:"🏗️", n:"Grúa",               d:"100.000 kg movidos en total"},
    {id:"km10",    ico:"🚶", n:"10 km",              d:"10 km de cardio en total"},
    {id:"monte",   ico:"⛰️", n:"Montañero",          d:"60 min de cinta en cuesta (5 % o más)"},
    {id:"pierna",  ico:"🦵", n:"Nunca saltas pierna",d:"10 sesiones con ejercicio de pierna"},
    {id:"buho",    ico:"🦉", n:"Búho",               d:"Terminar un entreno después de las 21:00"},
    {id:"frio",    ico:"❄️", n:"Valiente del frío",  d:"4 sesiones en diciembre"},
    {id:"casa",    ico:"🏠", n:"En casa también",    d:"Hacer la rutina de casa"},
    {id:"coleccion10", ico:"🃏", n:"Coleccionista",  d:"10 tarjetas distintas"},
  ];
  const lunesDeF = f => { const d = new Date(f+"T12:00:00"); return addDias(f, -((d.getDay()+6)%7)); };

  // Recorre las sesiones en orden y apunta el día en que se consiguió cada logro
  function calcular(user, sesiones){
    const hechas = sesiones.filter(terminadaG);
    const conseguidos = {};   // id → fecha
    const dar = (id, f) => { if(!conseguidos[id]) conseguidos[id] = f; };
    const tarjetas = {};      // id → [fechas]
    let kgTotal = 0, km = 0, cuesta = 0, pierna = 0, diciembre = {};
    const porSemana = {}, ultimoKg = {};
    hechas.forEach((g, i) => {
      const c = cuentas(g), f = g.fecha, n = i + 1;
      const t = tarjetaDe(user, f);
      (tarjetas[t.id] = tarjetas[t.id] || []).push(f);
      if(n >= 1) dar("primera", f);
      if(n >= 5) dar("s5", f);
      if(n >= 10) dar("s10", f);
      if(n >= 25) dar("s25", f);
      if(n >= 50) dar("s50", f);
      const L = lunesDeF(f);
      porSemana[L] = (porSemana[L] || 0) + 1;
      if(porSemana[L] >= 2) dar("semana", f);
      let seguidas = 0, l = L;
      while(porSemana[l]){ seguidas++; l = addDias(l, -7); }
      if(seguidas >= 4) dar("racha4", f);
      for(const x of (g.registro?.ejercicios || [])){
        if(!x.hecho || !numero(x.kg)) continue;
        if(ultimoKg[x.id] && numero(x.kg) > ultimoKg[x.id]) dar("sube", f);
        ultimoKg[x.id] = numero(x.kg);
      }
      if(c.kg >= 10000) dar("elefante", f);
      kgTotal += c.kg; if(kgTotal >= 100000) dar("grua", f);
      km += c.cardioKm; if(km >= 10) dar("km10", f);
      cuesta += c.cuestaMin; if(cuesta >= 60) dar("monte", f);
      if(c.pierna){ pierna++; if(pierna >= 10) dar("pierna", f); }
      const fin = g.registro?.fin ? new Date(g.registro.fin) : null;
      if(fin && fin.getHours() >= 21) dar("buho", f);
      if(f.slice(5,7) === "12"){ const a = f.slice(0,4); diciembre[a] = (diciembre[a]||0) + 1; if(diciembre[a] >= 4) dar("frio", f); }
      if(g.dia === "D") dar("casa", f);
      if(Object.keys(tarjetas).length >= 10) dar("coleccion10", f);
    });
    return {hechas, conseguidos, tarjetas, kgTotal};
  }

  // ---------- Datos ----------
  let datos = null, cargando = false;   // {user, sesiones, ...calcular()}
  let sobreNuevo = null, coleccionAbierta = false;

  async function cargar(user){
    if(cargando) return;
    cargando = true;
    const {data} = await sb.from("pastanaga_gym").select("fecha,dia,hechos,registro").eq("user_id", user).order("fecha");
    const sesiones = data || [];
    datos = Object.assign({user, sesiones}, calcular(user, sesiones));
    cargando = false;
    if(vista === "gym") render();
  }
  function listos(user){
    if(datos && datos.user === user) return true;
    if(datos && datos.user !== user) datos = null;
    cargar(user);
    return false;
  }
  window.logrosRefrescar = function(){ datos = null; };

  // ---------- Textos ----------
  // En español el navegador no pone el punto en números de 4 cifras (5350): se pone a mano
  const fmt = (v, d=0) => {
    const [e, dec] = Number(v).toLocaleString("es-ES", {maximumFractionDigits:d, useGrouping:false}).split(",");
    return e.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec ? "," + dec : "");
  };
  const OBJETOS = [[4000,"elefante","elefantes","🐘"],[1300,"coche","coches","🚗"],[400,"piano","pianos","🎹"],[80,"persona","personas","🧍"]];
  function equivale(kg){
    const o = OBJETOS.find(([p]) => kg >= p);
    if(!o) return "";
    const n = kg / o[0];
    return "≈ " + fmt(n, n < 10 ? 1 : 0) + " " + (Math.round(n*10)/10 === 1 ? o[1] : o[2]) + " " + o[3];
  }
  function duracion(r){
    if(!r.inicio || !r.fin) return "";
    const min = Math.round((new Date(r.fin) - new Date(r.inicio)) / 60000);
    if(min <= 0 || min > 300) return "";
    return min >= 60 ? Math.floor(min/60) + " h " + String(min%60).padStart(2,"0") + " min" : min + " min";
  }
  const DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  function proxima(){
    if(!window.habitoRutinaDe) return "";
    for(let i = 1; i <= 14; i++){
      const f = addDias(fechaGym, i), r = habitoRutinaDe(f);
      if(r) return (i === 1 ? "mañana" : DIAS[new Date(f+"T12:00:00").getDay()] + " " + parseInt(f.slice(8))) + " · " + nombreRutina(perfil, r);
    }
    return "";
  }
  // Lo que ha cambiado respecto a la última vez que hizo esta rutina
  function comparar(g){
    const antes = [...datos.hechas].reverse().find(s => s.fecha < g.fecha && s.dia === g.dia && s.registro?.ejercicios);
    if(!antes) return {primera: true, lineas: []};
    const lineas = [];
    for(const x of g.registro.ejercicios){
      if(!x.hecho) continue;
      const y = antes.registro.ejercicios.find(z => z.id === x.id && z.hecho);
      if(!y) continue;
      const n = (BIB[x.id] || {n:x.id}).n;
      const kA = numero(y.kg), kH = numero(x.kg), sA = seriesDeEj(y), sH = seriesDeEj(x);
      if(kH && kA && kH !== kA) lineas.push({sube: kH > kA, t: n + ": " + fmt(kA,1) + " → " + fmt(kH,1) + " kg"});
      else if(sH !== sA) lineas.push({sube: sH > sA, t: n + ": " + sA + " → " + sH + " series"});
    }
    return {primera: false, lineas, fecha: antes.fecha};
  }

  // ---------- Tarjeta de fin de sesión ----------
  function cartaHTML(t, extra="", clase=""){
    return `<div class="lg-carta r-${t.r} ${clase}">
      <div class="lg-ico">${t.ico}</div>
      <p class="lg-n">${esc(t.n)}</p>
      <p class="lg-r">${RAREZAS[t.r].nombre}</p>
      ${extra}
    </div>`;
  }

  window.finHTML = function(mio){
    const user = gymUser || uid;
    if(!sesionG || !sesionG.registro) return "";
    if(!listos(user)) return '<div class="card lg-fin"><p class="muted">Preparando el resumen…</p></div>';
    const g = {fecha: fechaGym, dia: sesionG.dia, registro: sesionG.registro};
    const c = cuentas(g);
    const n = datos.hechas.filter(s => s.fecha <= fechaGym).length || 1;
    const cmp = comparar(g);
    const t = tarjetaDe(user, fechaGym);
    const repe = (datos.tarjetas[t.id] || []).filter(f => f <= fechaGym).length;
    const nuevos = LOGROS.filter(l => datos.conseguidos[l.id] === fechaGym);
    const dur = duracion(sesionG.registro);
    const prox = mio ? proxima() : "";
    const nombre = mio ? "" : esc((parejaPerfil || {}).nombre || "") + " · ";
    const kcalPesas = Math.round(c.series * 6 * ((mio ? perfil.peso : (parejaPerfil||{}).peso) || 80) / 80);
    const abrir = sobreNuevo === fechaGym && mio;
    if(abrir) setTimeout(() => { sobreNuevo = null; }, 100);

    return `
    <div class="card lg-fin">
      <p class="lg-titulo">🎉 ${nombre}Sesión nº ${n} hecha</p>
      <p class="muted">${esc(nombreRutina(mio ? perfil : parejaPerfil, sesionG.dia))}${dur ? " · ⏱ " + dur : ""}</p>
      <div class="lg-datos">
        ${c.kg ? `<div><b>${fmt(c.kg)} kg</b><span>movidos ${equivale(c.kg)}</span></div>` : ""}
        <div><b>${c.series}</b><span>series</span></div>
        ${c.cardioMin ? `<div><b>${fmt(c.cardioMin)} min</b><span>de cardio${c.cardioKm ? " · " + fmt(c.cardioKm, 2) + " km" : ""}</span></div>` : ""}
        <div><b>~${fmt(c.kcalCardio + kcalPesas)}</b><span>kcal de más</span></div>
      </div>
      ${cmp.primera
        ? `<p class="muted lg-cmp">Primera vez con esta rutina: la próxima verás si mejoras.</p>`
        : cmp.lineas.length
          ? `<div class="lg-cmp"><p class="muted">Respecto al ${parseInt(cmp.fecha.slice(8))}/${parseInt(cmp.fecha.slice(5,7))}:</p>${cmp.lineas.map(l => `<p class="${l.sube ? "sube" : "baja"}">${l.sube ? "💪" : "↘"} ${esc(l.t)}</p>`).join("")}</div>`
          : `<p class="muted lg-cmp">Igual que la última vez. La próxima, sube un poco en uno.</p>`}
      ${nuevos.length ? `<div class="lg-nuevos">${nuevos.map(l => `<span>${l.ico} ${esc(l.n)}</span>`).join("")}</div>` : ""}
      <div class="lg-sobre">
        ${cartaHTML(t, `<p class="lg-frase">${esc(t.frase)}</p>${repe > 1 ? `<p class="lg-repe">repetida ×${repe}</p>` : ""}`, abrir ? "gira" : "")}
        <div class="lg-sobre-txt">
          <p style="font-weight:800">🃏 Tarjeta del día</p>
          <p class="muted" style="font-size:13px">Cada sesión terminada abre un sobre.</p>
          <button class="btn sec sm" data-lg-coleccion style="margin-top:8px">Ver colección (${Object.keys(datos.tarjetas).length}/${BARAJA.length})</button>
        </div>
      </div>
      ${prox ? `<p class="lg-prox">➡️ Próxima: <b>${esc(prox)}</b></p>` : ""}
    </div>`;
  };

  // Botón de la colección, abajo del Gym (también antes de terminar)
  window.coleccionBotonHTML = function(){
    const user = gymUser || uid;
    if(!listos(user)) return "";
    const nl = Object.keys(datos.conseguidos).length;
    return `<button class="btn sec sm" data-lg-coleccion style="margin-top:10px">🃏 Colección y logros · ${Object.keys(datos.tarjetas).length}/${BARAJA.length} · 🏅 ${nl}/${LOGROS.length}</button>`;
  };

  function coleccionHTML(){
    const mio = (gymUser || uid) === uid;
    const quien = mio ? "Tu" : "La de " + esc((parejaPerfil||{}).nombre || "");
    const orden = ["legendaria","epica","rara","comun"];
    return `
    <div class="overlay" id="lg-ov">
      <div class="sheet lg-col">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h2>🃏 ${quien} colección</h2>
          <button class="hb-link" id="lg-x" style="font-size:20px;text-decoration:none">✕</button>
        </div>
        <p class="muted" style="margin:4px 0 12px">${Object.keys(datos.tarjetas).length} de ${BARAJA.length} tarjetas · cada sesión terminada abre un sobre</p>
        <div class="lg-grid">
          ${orden.flatMap(r => BARAJA.filter(t => t.r === r)).map(t => {
            const fs = datos.tarjetas[t.id];
            return fs
              ? cartaHTML(t, fs.length > 1 ? `<p class="lg-repe">×${fs.length}</p>` : "")
              : `<div class="lg-carta lg-falta r-${t.r}"><div class="lg-ico">?</div><p class="lg-r">${RAREZAS[t.r].nombre}</p></div>`;
          }).join("")}
        </div>
        <h2 style="margin:18px 0 8px">🏅 Logros · ${Object.keys(datos.conseguidos).length}/${LOGROS.length}</h2>
        <div class="lg-logros">
          ${LOGROS.map(l => {
            const f = datos.conseguidos[l.id];
            return `<div class="lg-logro ${f ? "si" : ""}">
              <span class="lg-logro-ico">${f ? l.ico : "🔒"}</span>
              <div><p style="font-weight:800">${esc(l.n)}</p><p class="muted" style="font-size:12px">${esc(l.d)}${f ? " · " + parseInt(f.slice(8)) + "/" + parseInt(f.slice(5,7)) : ""}</p></div>
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>`;
  }

  window.finWire = function(){
    document.querySelectorAll("[data-lg-coleccion]").forEach(b => b.onclick = () => {
      if(!datos) return;
      coleccionAbierta = true;
      document.body.insertAdjacentHTML("beforeend", coleccionHTML());
      const ov = document.getElementById("lg-ov");
      const cerrar = () => { coleccionAbierta = false; ov.remove(); };
      ov.onclick = e => { if(e.target === ov) cerrar(); };
      document.getElementById("lg-x").onclick = cerrar;
    });
  };

  // Recién terminada: sobre con animación y aviso a la pareja (solo hoy y solo una vez)
  window.finAlTerminar = async function(){
    const r = sesionG.registro;
    sobreNuevo = fechaGym;
    datos = null;
    if(fechaGym !== hoy() || r.avisado || !parejaPerfil) return;
    const c = cuentas({registro: r});
    const partes = [nombreRutina(perfil, sesionG.dia)];
    if(c.kg) partes.push(fmt(c.kg) + " kg movidos");
    if(c.cardioMin) partes.push(fmt(c.cardioMin) + " min de cardio");
    r.avisado = true;
    await guardarSesion();
    avisar(parejaPerfil.user_id, "💪 " + (perfil.nombre || "Tu pareja") + " ha terminado su entreno", partes.join(" · "));
  };

  // Para probarlo desde la consola o un test
  window._logros = {tarjetaDe, cuentas, calcular, equivale, BARAJA, LOGROS};
})();
