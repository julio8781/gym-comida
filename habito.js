/* ============================================================
   PASTANAGA · módulo Hábito (que Julio no deje el gym)
   Autónomo, como cuentas.js: se apoya en sb, uid, perfil, parejaPerfil,
   gymUser, diaGym, hoy(), addDias(), esc() y render() de app.js.
   Solo LEE pastanaga_gym (no la cambia) y usa su propia tabla nueva,
   pastanaga_semanas (ver sql/gym_habito.sql).

   La idea:
   - Cada semana se elige qué semana es (columna semana_gym):
     🏋️ semana de gym → lunes, miércoles y viernes. Cumplida con 2 sesiones.
     🏠 semana en casa → rutina D. Cumplida con 1.
   - Una sesión cuenta en cuanto marcas UN ejercicio: ir ya es ganar.
   - La racha es de SEMANAS cumplidas: fallar un día no la rompe.

   Expone: window.habitoHTML(), window.habitoWire(),
           window.habitoRutinaHoy(), window.habitoRefrescar()
============================================================ */
(function(){
  const MINIMO = { gym: 2, casa: 1 };
  // Qué rutina toca cada día en semana de gym (0 = lunes)
  const RUTINA_GYM = { 0: "A", 2: "B", 4: "C" };
  const DIAS = ["L","M","X","J","V","S","D"];

  let datos = null;        // {user, semanas:{lunes:bool}, sesiones:{fecha:{dia}}}
  let cargandoDe = null;   // user_id que se está cargando (para no repetir)
  let error = "";
  let sugeridoPara = null; // día en que ya se propuso la rutina (si eliges otra a mano, se respeta)

  // ---- fechas ----
  // El lunes de la semana de una fecha 'YYYY-MM-DD'
  function lunesDe(f){
    const d = new Date(f+"T12:00:00");
    const desdeLunes = (d.getDay()+6) % 7;   // getDay: 0 = domingo
    return addDias(f, -desdeLunes);
  }
  const diaSemana = f => (new Date(f+"T12:00:00").getDay()+6) % 7;

  // ---- leer de Supabase ----
  async function cargar(user){
    if(cargandoDe === user) return;
    cargandoDe = user; error = "";
    const desde = addDias(lunesDe(hoy()), -7*52);   // un año atrás basta
    try{
      const [{data:sem, error:e1}, {data:gyms, error:e2}] = await Promise.all([
        sb.from("pastanaga_semanas").select("*").eq("user_id", user).gte("lunes", desde),
        sb.from("pastanaga_gym").select("fecha,dia,hechos,registro").eq("user_id", user).gte("fecha", desde),
      ]);
      if(e1) error = "Falta crear la tabla de semanas en Supabase (sql/gym_habito.sql)";
      if(e2) error = "No he podido leer tus sesiones: " + e2.message;
      const semanas = {};
      (sem||[]).forEach(s => semanas[s.lunes] = (s.semana_gym ?? s.roney_tarde));
      const sesiones = {};
      (gyms||[]).forEach(g => { if(fueAlGym(g)) sesiones[g.fecha] = {dia: g.dia}; });
      datos = {user, semanas, sesiones};
    }catch(e){
      error = "No he podido cargar la semana";
      datos = {user, semanas:{}, sesiones:{}};
    }
    cargandoDe = null;
    if(vista === "gym") render();
  }

  // Cuenta en cuanto hay UN ejercicio marcado (los dos formatos de pastanaga_gym)
  function fueAlGym(g){
    if(g.registro?.ejercicios?.length) return g.registro.ejercicios.some(x => x.hecho);
    return Object.entries(g.hechos||{}).some(([k,v]) => v && k.startsWith(g.dia+"-"));
  }

  // ---- cálculos de una semana ----
  function semana(lunes){
    const gym = datos.semanas[lunes];            // true | false | undefined
    const tipo = gym ? "gym" : "casa";           // sin responder → como semana en casa
    const dias = [];
    let n = 0;
    for(let i=0;i<7;i++){
      const f = addDias(lunes, i);
      const s = datos.sesiones[f];
      if(s) n++;
      dias.push({f, s});
    }
    return {lunes, gym, tipo, dias, n, minimo: MINIMO[tipo], cumplida: n >= MINIMO[tipo]};
  }

  // Semanas cumplidas seguidas. La de ahora suma si ya está cumplida;
  // si aún no, no rompe la racha (todavía estás a tiempo).
  function racha(){
    let l = lunesDe(hoy()), r = 0;
    if(semana(l).cumplida) r++;
    l = addDias(l, -7);
    for(let i=0;i<104;i++){
      if(!semana(l).cumplida) break;
      r++; l = addDias(l, -7);
    }
    return r;
  }

  // ---- lo que ve la pestaña Gym ----
  window.habitoHTML = function(){
    const user = gymUser || uid;
    if(!datos || datos.user !== user){ cargar(user); return '<div class="card hb"><p class="muted">Cargando tu semana…</p></div>'; }

    const mio = user === uid;
    const nombre = mio ? "" : esc(parejaPerfil ? parejaPerfil.nombre : "");
    const w = semana(lunesDe(hoy()));
    const H = hoy();
    const r = racha();

    const pregunta = (w.gym === undefined && mio) ? `
      <p style="font-weight:800;margin:4px 0 8px">¿Qué semana toca?</p>
      <div class="row">
        <button class="btn green sm" id="hb-si">🏋️ De gym</button>
        <button class="btn sec sm" id="hb-no">🏠 En casa</button>
      </div>` : "";

    const plan = w.gym === undefined
      ? (mio ? "" : '<p class="muted">Aún no ha dicho cómo es su semana</p>')
      : (w.tipo === "gym"
          ? '<p class="muted">🏋️ Semana de gym · lunes, miércoles y viernes · cuenta con 2</p>'
          : '<p class="muted">🏠 Semana en casa · rutina "En casa" · cuenta con 1 (si vas al gym, también vale)</p>');

    const puntos = w.dias.map((d,i)=>{
      const toca = w.tipo === "gym" ? (i in RUTINA_GYM) : false;
      const ico = d.s ? (d.s.dia === "D" ? "🏠" : "💪") : (d.f === H ? "·" : "");
      const cls = ["hb-d", d.s ? "si" : "", toca && !d.s ? "toca" : "", d.f === H ? "hoy" : ""].join(" ");
      return `<div class="${cls}"><span>${DIAS[i]}</span><b>${ico}</b></div>`;
    }).join("");

    const estado = w.cumplida
      ? '<div class="ok" style="margin-top:8px">✅ Semana cumplida'+(mio?", sigue así":"")+'</div>'
      : `<p style="font-weight:700;margin-top:8px">${w.n}/${w.minimo} · ${mio ? "te falta" : "le falta"} ${w.minimo - w.n} para cumplir la semana</p>`;

    const cambiar = (mio && w.gym !== undefined)
      ? '<button id="hb-cambiar" class="hb-link">cambiar: '+(w.gym ? "pasar a semana en casa" : "pasar a semana de gym")+'</button>' : "";

    return `
    <div class="card hb">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2>${mio ? "Mi semana" : "Semana de "+nombre}</h2>
        <span class="hb-racha" title="Semanas cumplidas seguidas">🔥 ${r} ${r===1?"semana":"semanas"}</span>
      </div>
      ${error ? '<div class="err" style="margin-top:8px">⚠ '+esc(error)+'</div>' : ""}
      ${pregunta}
      ${plan}
      <div class="hb-dias">${puntos}</div>
      ${estado}
      ${cambiar}
    </div>`;
  };

  // Guarda la respuesta de esta semana
  async function responder(gym){
    const lunes = lunesDe(hoy());
    let {error:e} = await sb.from("pastanaga_semanas").upsert({user_id: uid, lunes, semana_gym: gym});
    // Mientras la columna no se haya renombrado en Supabase (sql/gym_habito.sql), usar la vieja
    if(e && /semana_gym/.test(e.message||""))
      ({error:e} = await sb.from("pastanaga_semanas").upsert({user_id: uid, lunes, roney_tarde: gym}));
    if(e){ error = "No se guardó: " + e.message; render(); return; }
    datos.semanas[lunes] = gym;
    sugeridoPara = null;                 // que vuelva a proponer la rutina del día
    render();
  }

  window.habitoWire = function(){
    const si = document.getElementById("hb-si"), no = document.getElementById("hb-no");
    if(si) si.onclick = () => responder(true);
    if(no) no.onclick = () => responder(false);
    const c = document.getElementById("hb-cambiar");
    if(c) c.onclick = () => responder(!datos.semanas[lunesDe(hoy())]);
  };

  // Qué rutina proponer hoy (o null si hoy no toca)
  window.habitoRutinaHoy = function(){
    if(!datos || datos.user !== uid) return null;
    const gym = datos.semanas[lunesDe(hoy())];
    if(gym === undefined) return null;
    if(!gym) return "D";
    return RUTINA_GYM[diaSemana(hoy())] || null;
  };

  // La propone una sola vez por día
  window.habitoSugerir = function(){
    if(sugeridoPara === hoy()) return null;
    const r = window.habitoRutinaHoy();
    if(r) sugeridoPara = hoy();
    return r;
  };

  // Tras marcar un ejercicio: volver a leer para que cuenten los puntitos
  window.habitoRefrescar = function(){
    if(datos) cargar(datos.user);
  };
})();
