/* ============================================================
   PASTANAGA · módulo Hábito (que Julio no deje el gym)
   Autónomo, como cuentas.js: se apoya en sb, uid, perfil, parejaPerfil,
   gymUser, diaGym, hoy(), addDias(), esc() y render() de app.js.
   Solo LEE pastanaga_gym (no la cambia) y usa su propia tabla nueva,
   pastanaga_semanas (ver sql/gym_habito.sql).

   La idea:
   - Cada semana se elige qué semana es (columna semana_gym) y QUÉ DÍAS
     (columna dias, 0 = lunes; se cambian tocando los días de la tarjeta):
     🏋️ semana de gym → de serie L-X-V. Cumplida con 2 sesiones.
     🏠 semana en casa → de serie M y S, rutina D. Cumplida con 1.
     Si una semana no tiene días, se usan los de la última semana del mismo tipo.
   - Rutina de cada día de gym: el 1.º elegido A, el 2.º B, el 3.º C (y vuelta).
   - Una sesión cuenta en cuanto marcas UN ejercicio: ir ya es ganar.
   - La racha es de SEMANAS cumplidas: fallar un día no la rompe.

   Expone: window.habitoHTML(), window.habitoWire(),
           window.habitoRutinaHoy(), window.habitoRefrescar()
============================================================ */
(function(){
  const MINIMO = { gym: 2, casa: 1 };
  const DIAS_DEF = { gym: [0,2,4], casa: [1,5] };
  const ROTACION = ["A","B","C"];
  const DIAS = ["L","M","X","J","V","S","D"];
  const DIAS_LARGO = ["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];

  let datos = null;        // {user, semanas:{lunes:{gym, dias}}, sesiones:{fecha:{dia}}}
  let cargandoDe = null;   // user_id que se está cargando (para no repetir)
  let error = "";
  let sugeridoPara = null; // día en que ya se propuso la rutina (si eliges otra a mano, se respeta)
  let sinColumnaDias = false;

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
      (sem||[]).forEach(s => semanas[s.lunes] = {
        gym: (s.semana_gym ?? s.roney_tarde),
        dias: Array.isArray(s.dias) && s.dias.length ? [...s.dias].sort((a,b)=>a-b) : null,
      });
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

  // Días de una semana: los suyos, si no los de la última semana del mismo tipo, si no los de serie
  function diasDe(lunes, tipo){
    const s = datos.semanas[lunes];
    if(s && s.dias) return s.dias;
    const previas = Object.keys(datos.semanas).filter(l => l < lunes).sort().reverse();
    for(const l of previas){
      const p = datos.semanas[l];
      if(p.dias && (p.gym ? "gym" : "casa") === tipo) return p.dias;
    }
    return DIAS_DEF[tipo];
  }

  // ---- cálculos de una semana ----
  function semana(lunes){
    const gym = datos.semanas[lunes]?.gym;          // true | false | undefined
    const tipo = gym ? "gym" : "casa";               // sin responder → como semana en casa
    const elegidos = diasDe(lunes, tipo);
    const dias = [];
    let n = 0;
    for(let i=0;i<7;i++){
      const f = addDias(lunes, i);
      const s = datos.sesiones[f];
      if(s) n++;
      dias.push({f, s, toca: elegidos.includes(i)});
    }
    const minimo = Math.max(1, Math.min(MINIMO[tipo], elegidos.length));
    return {lunes, gym, tipo, elegidos, dias, n, minimo, cumplida: n >= minimo};
  }

  // Qué rutina toca un día (0 = lunes) en una semana
  function rutinaDelDia(w, i){
    if(!w.elegidos.includes(i)) return null;
    if(w.tipo === "casa") return "D";
    return ROTACION[w.elegidos.indexOf(i) % ROTACION.length];
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

  // «lunes, miércoles y viernes»
  function listaDias(ds){
    const n = ds.map(i => DIAS_LARGO[i]);
    return n.length > 1 ? n.slice(0,-1).join(", ") + " y " + n[n.length-1] : (n[0] || "ningún día");
  }

  // ---- lo que ve la pestaña Gym ----
  window.habitoHTML = function(){
    const user = gymUser || uid;
    if(!datos || datos.user !== user){ cargar(user); return '<div class="card hb"><p class="muted">Cargando tu semana…</p></div>'; }

    const mio = user === uid;
    const nombre = mio ? "" : esc(parejaPerfil ? parejaPerfil.nombre : "");
    const L = lunesDe(fechaGym || hoy());          // la semana del día que se está viendo
    const w = semana(L);
    const H = hoy();
    const esta = L === lunesDe(H);
    const r = racha();
    const elegida = w.gym !== undefined;
    const tocable = mio && elegida;

    const pregunta = (!elegida && mio) ? `
      <p style="font-weight:800;margin:4px 0 8px">¿Qué semana toca?</p>
      <div class="row">
        <button class="btn green sm" id="hb-si">🏋️ De gym</button>
        <button class="btn sec sm" id="hb-no">🏠 En casa</button>
      </div>` : "";

    const plan = !elegida
      ? (mio ? "" : '<p class="muted">Aún no ha dicho cómo es su semana</p>')
      : '<p class="muted">'+(w.tipo === "gym" ? "🏋️ Semana de gym" : "🏠 Semana en casa")
        + " · " + listaDias(w.elegidos) + " · cuenta con " + w.minimo + "</p>";

    const puntos = w.dias.map((d,i)=>{
      const ico = d.s ? (d.s.dia === "D" ? "🏠" : "💪") : (d.toca && elegida ? (rutinaDelDia(w,i) || "") : "");
      const cls = ["hb-d", d.s ? "si" : "", d.toca && elegida && !d.s ? "toca" : "", d.f === H ? "hoy" : "", d.f === fechaGym ? "ver" : ""].join(" ");
      return `<button class="${cls}" data-hbdia="${i}" data-hbf="${d.f}"><span>${DIAS[i]}</span><b>${ico}</b></button>`;
    }).join("");

    const ayuda = tocable ? '<p class="muted" style="margin-top:6px;font-size:12px">Toca un día para verlo · <b>doble toque</b> para ponerlo o quitarlo</p>'
                         : '<p class="muted" style="margin-top:6px;font-size:12px">Toca un día para verlo</p>';

    const estado = w.cumplida
      ? '<div class="ok" style="margin-top:8px">✅ Semana cumplida'+(mio?", sigue así":"")+'</div>'
      : `<p style="font-weight:700;margin-top:8px">${w.n}/${w.minimo} · ${mio ? "te falta" : "le falta"} ${w.minimo - w.n} para cumplir la semana</p>`;

    const cambiar = tocable
      ? '<button id="hb-cambiar" class="hb-link">cambiar: '+(w.gym ? "pasar a semana en casa" : "pasar a semana de gym")+'</button>' : "";

    return `
    <div class="card hb">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2>${esta ? (mio ? "Mi semana" : "Semana de "+nombre) : "Semana del "+new Date(L+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"})}</h2>
        <span class="hb-racha" title="Semanas cumplidas seguidas">🔥 ${r} ${r===1?"semana":"semanas"}</span>
      </div>
      ${error ? '<div class="err" style="margin-top:8px">⚠ '+esc(error)+'</div>' : ""}
      ${pregunta}
      ${plan}
      <div class="hb-dias">${puntos}</div>
      ${ayuda}
      ${estado}
      ${cambiar}
    </div>`;
  };

  // Guarda cómo es esta semana (tipo y días)
  async function guardar(gym, dias, lunes = lunesDe(fechaGym || hoy())){
    const fila = {user_id: uid, lunes, semana_gym: gym};
    if(dias && !sinColumnaDias) fila.dias = dias;
    let {error:e} = await sb.from("pastanaga_semanas").upsert(fila);
    // Si aún no está la columna «dias» en Supabase, se guarda al menos el tipo de semana
    if(e && /dias/.test(e.message||"")){
      sinColumnaDias = true;
      delete fila.dias;
      ({error:e} = await sb.from("pastanaga_semanas").upsert(fila));
      if(!e) error = "Para guardar los días falta un paso en Supabase (sql/gym_habito.sql)";
    }
    if(e){ error = "No se guardó: " + e.message; render(); return; }
    datos.semanas[lunes] = {gym, dias: (dias && !sinColumnaDias) ? dias : (datos.semanas[lunes]?.dias || null)};
    sugeridoPara = null;                 // que vuelva a proponer la rutina del día
    render();
  }

  // Ir a un día (un toque): se ve su sesión o, si no hay, la rutina que toca
  async function irA(f){
    fechaGym = f;
    await cargarGymDia();
    if(!sesionG && (gymUser||uid) === uid){ const k = window.habitoRutinaDe(f); if(k) diaGym = k; }
    render();
  }

  window.habitoWire = function(){
    const lunes = lunesDe(fechaGym || hoy());
    const si = document.getElementById("hb-si"), no = document.getElementById("hb-no");
    if(si) si.onclick = () => guardar(true, diasDe(lunes, "gym"));
    if(no) no.onclick = () => guardar(false, diasDe(lunes, "casa"));
    const c = document.getElementById("hb-cambiar");
    if(c) c.onclick = () => {
      const gym = !datos.semanas[lunes]?.gym;
      // al cambiar de tipo, los días son los de ese tipo (no los de la otra)
      if(datos.semanas[lunes]) datos.semanas[lunes].dias = null;
      guardar(gym, diasDe(lunes, gym ? "gym" : "casa"));
    };
    // Un toque = ir a ese día; doble toque = ponerlo o quitarlo del plan.
    // El toque espera un poquito por si llega el segundo.
    document.querySelectorAll("[data-hbdia]").forEach(b => b.onclick = () => {
      const i = parseInt(b.dataset.hbdia), f = b.dataset.hbf;
      if(ultimoToque.i === i && Date.now() - ultimoToque.t < 350){
        clearTimeout(ultimoToque.espera); ultimoToque = {i:-1, t:0};
        if(document.getElementById("hb-cambiar")) cambiarDia(i);   // solo si es tuya y ya elegiste semana
        return;
      }
      clearTimeout(ultimoToque.espera);
      ultimoToque = {i, t: Date.now(), espera: setTimeout(() => irA(f), 350)};
    });
  };

  let ultimoToque = {i:-1, t:0};
  function cambiarDia(i){
    const lunes = lunesDe(fechaGym || hoy());
    {
      const w = semana(lunes);
      const dias = w.elegidos.includes(i) ? w.elegidos.filter(x => x !== i) : [...w.elegidos, i].sort((a,b)=>a-b);
      if(!dias.length){ error = "Deja al menos un día"; render(); return; }
      error = "";
      guardar(w.gym, dias);
    }
  }

  // Qué rutina toca un día (o null si ese día no toca)
  window.habitoRutinaDe = function(f){
    if(!datos || datos.user !== uid) return null;
    const w = semana(lunesDe(f));
    if(w.gym === undefined) return null;
    if(w.tipo === "casa") return "D";            // en semana de casa, si entrenas, es la de casa
    return rutinaDelDia(w, diaSemana(f));
  };
  window.habitoRutinaHoy = () => window.habitoRutinaDe(hoy());

  // La propone una sola vez por día
  window.habitoSugerir = function(){
    if(sugeridoPara === hoy()) return null;
    const r = window.habitoRutinaHoy();
    if(r) sugeridoPara = hoy();
    return r;
  };

  // Tras marcar un ejercicio: volver a leer para que cuenten los puntitos
  // ---- para «Me quiero borrar» (baja.js) ----
  // Lo conseguido: racha, semanas cumplidas en total y sesiones (último año)
  window.habitoResumen = function(){
    if(!datos || datos.user !== uid) return null;
    const fechas = [...Object.keys(datos.semanas), ...Object.keys(datos.sesiones)].sort();
    if(!fechas.length) return {racha: 0, cumplidas: 0, sesiones: 0, desde: null};
    let l = lunesDe(fechas[0]), cumplidas = 0;
    const fin = lunesDe(hoy());
    while(l <= fin){ if(semana(l).cumplida) cumplidas++; l = addDias(l, 7); }
    return {racha: racha(), cumplidas, sesiones: Object.keys(datos.sesiones).length, desde: fechas[0]};
  };
  // Bajar el plan de esta semana (y las siguientes, que lo heredan) a 1 día
  window.habitoBajarPlan = async function(){
    if(!datos) return;
    const lunes = lunesDe(hoy()), w = semana(lunes);
    const queda = w.elegidos.find(i => i >= diaSemana(hoy())) ?? w.elegidos[w.elegidos.length-1];
    await guardar(w.gym === undefined ? true : w.gym, [queda], lunes);
  };
  // Pasar esta semana a «en casa», con un día a partir de mañana
  window.habitoSemanaCasa = async function(){
    if(!datos) return;
    await guardar(false, [Math.min(6, diaSemana(hoy()) + 1)], lunesDe(hoy()));
  };

  window.habitoRefrescar = function(){
    if(datos) cargar(datos.user);
  };
})();
