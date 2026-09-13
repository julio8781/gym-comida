/* ============================================================
   PASTANAGA · módulo Cuentas (bote común de pareja)
   Autónomo: se apoya en sb, uid, perfil, gemini(), esc() de app.js
   Expone window.renderCuentas() y usa el div #app como el resto.
============================================================ */
(function(){
  const CATS = ["Casa","Súper","Recibos","Ocio","Coche","Salud","Otros"];
  const COLOR = {Casa:"#f97316",Súper:"#16a34a",Recibos:"#0ea5e9",Ocio:"#a855f7",Coche:"#64748b",Salud:"#ef4444",Otros:"#eab308"};

  let mesSel = null;          // 'YYYY-MM'
  let movs = [];              // movimientos del mes
  let cargando = false, err = "", tkPend = null;

  const pad = n => String(n).padStart(2,"0");
  const mesActual = () => { const d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1); };
  const mesMas = (m,n) => { const [a,me]=m.split("-").map(Number); const d=new Date(a,me-1+n,1); return d.getFullYear()+"-"+pad(d.getMonth()+1); };
  const mesBonito = m => { const [a,me]=m.split("-").map(Number); return new Date(a,me-1,1).toLocaleDateString("es-ES",{month:"long",year:"numeric"}); };
  const eur = n => (Math.round(n*100)/100).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
  const esc2 = s => (window.esc ? window.esc(s) : String(s??""));

  async function cargar(){
    const {data} = await sb.from("pastanaga_finanzas").select().eq("mes",mesSel).order("id");
    movs = data || [];
  }

  // Al entrar en un mes vacío, copiar los fijos del mes anterior
  async function sembrarFijos(){
    if(movs.length) return;
    const {data} = await sb.from("pastanaga_finanzas").select().eq("mes",mesMas(mesSel,-1)).eq("fijo",true);
    if(!data || !data.length) return;
    const nuevos = data.map(x=>({mes:mesSel, tipo:x.tipo, fijo:true, pagado:false, concepto:x.concepto, categoria:x.categoria, importe:x.importe, quien:x.quien}));
    await sb.from("pastanaga_finanzas").insert(nuevos);
    await cargar();
  }

  window.renderCuentas = async function(){
    const app = document.getElementById("app");
    if(!mesSel) mesSel = mesActual();
    app.innerHTML = '<div class="topbar"><h1>Cuentas 💰</h1></div><p class="muted">Cargando…</p>';
    await cargar();
    await sembrarFijos();
    pintar();
  };

  function pintar(){
    const app = document.getElementById("app");
    const ingresos = movs.filter(m=>m.tipo==="ingreso");
    const gastos = movs.filter(m=>m.tipo==="gasto");
    const totalIn = ingresos.reduce((s,m)=>s+Number(m.importe),0);
    const totalGas = gastos.reduce((s,m)=>s+Number(m.importe),0);
    const inPagado = ingresos.filter(m=>m.pagado).reduce((s,m)=>s+Number(m.importe),0);
    const gasPagado = gastos.filter(m=>m.pagado).reduce((s,m)=>s+Number(m.importe),0);
    const bote = inPagado - gasPagado;                 // dinero real en la cuenta
    const pendGas = totalGas - gasPagado;              // gastos que faltan por pagar
    const pendIn = totalIn - inPagado;                 // ingresos que faltan por entrar

    // gasto por categoría para la gráfica
    const porCat = {};
    gastos.forEach(g=>{ const c=g.categoria||"Otros"; porCat[c]=(porCat[c]||0)+Number(g.importe); });
    const cats = Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
    const maxCat = Math.max(1, ...cats.map(c=>c[1]));

    app.innerHTML = `
    <div class="topbar"><h1>Cuentas 💰</h1></div>

    <div class="fnav">
      <button id="c-prev">‹</button>
      <span class="f" style="text-transform:capitalize">${mesBonito(mesSel)}</span>
      <button id="c-next">›</button>
    </div>
    ${err?'<div class="err" style="margin-bottom:10px">⚠ '+esc2(err)+'</div>':""}

    <div class="card" style="text-align:center">
      <p class="muted" style="text-transform:uppercase;font-size:12px;letter-spacing:.5px">En la cuenta ahora</p>
      <p style="font-size:44px;font-weight:800;letter-spacing:-1px;color:${bote<0?"var(--red)":"var(--green)"}">${eur(bote)}</p>
      ${(pendGas>0||pendIn>0)?'<p class="muted" style="margin-top:2px">'+(pendIn>0?'faltan por entrar '+eur(pendIn):'')+(pendIn>0&&pendGas>0?' · ':'')+(pendGas>0?'por pagar '+eur(pendGas):'')+'</p>':''}
      <div class="mcards" style="margin-top:8px">
        <div class="mcard mc-carb">Ingresos<b>${eur(totalIn)}</b></div>
        <div class="mcard mc-prot">Gastos<b>${eur(totalGas)}</b></div>
      </div>
    </div>

    <div class="card">
      <div class="row">
        <button class="btn sm" id="c-add-in" style="background:var(--green)">＋ Ingreso</button>
        <button class="btn sm" id="c-add-gas">＋ Gasto</button>
      </div>
      <button class="btn sec sm" id="c-ticket" style="margin-top:8px" ${cargando?"disabled":""}>${cargando?'<span class="spin"></span>Leyendo ticket…':"🧾 Foto al ticket"}</button>
    </div>

    ${tkPend?`
    <div class="card" style="border:2px solid var(--carrot);background:var(--carrot-soft)">
      <h2>🧾 He leído del ticket:</h2>
      <div class="row" style="margin-top:8px">
        <input type="text" id="tk-con" value="${esc2(tkPend.concepto||'Compra')}" placeholder="concepto">
        <input type="number" id="tk-imp" value="${tkPend.importe||''}" placeholder="€" style="flex:0 0 90px">
      </div>
      <select id="tk-cat" style="margin-top:8px">${CATS.map(c=>'<option '+(c===(tkPend.categoria||'Súper')?'selected':'')+'>'+c+'</option>').join("")}</select>
      <div class="row" style="margin-top:10px">
        <button class="btn green sm" id="tk-ok">✓ Añadir gasto</button>
        <button class="btn sec sm" id="tk-no">Descartar</button>
      </div>
    </div>`:""}

    ${cats.length?`
    <div class="card">
      <h2>En qué se va</h2>
      <div style="margin-top:10px">
        ${cats.map(([c,v])=>`
        <div style="margin-bottom:9px">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:3px">
            <span>${esc2(c)}</span><span>${eur(v)}</span>
          </div>
          <div style="height:10px;background:var(--line);border-radius:6px;overflow:hidden">
            <div style="height:100%;width:${Math.round(v/maxCat*100)}%;background:${COLOR[c]||'#eab308'}"></div>
          </div>
        </div>`).join("")}
      </div>
    </div>`:""}

    ${bloqueLista("Ingresos", ingresos, "var(--green)", false)}
    ${bloqueLista("Gastos", gastos, "var(--red)", true)}
    `;

    wire();
  }

  function bloqueLista(titulo, lista, color, esGasto){
    if(!lista.length) return `<div class="card"><h2>${titulo}</h2><p class="muted" style="margin-top:8px">Nada este mes.</p></div>`;
    return `<div class="card"><h2>${titulo}</h2>
      ${lista.map(m=>`
      <div class="entry" style="align-items:center;${m.pagado?'':'opacity:.6'}">
        <button class="c-pag" data-id="${m.id}" title="${m.pagado?'pagado':'pendiente'}"
          style="width:28px;height:28px;flex-shrink:0;margin-right:10px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;border:2px solid ${m.pagado?(esGasto?'#c8e6cf':'#c8e6cf'):'var(--line)'};background:${m.pagado?'var(--green-soft)':'var(--card)'};color:var(--green)">${m.pagado?'✓':''}</button>
        <div style="flex:1">
          <p style="font-weight:700;font-size:14px">${esc2(m.concepto)}${m.fijo?' <span class="muted" style="font-size:11px">· fijo</span>':''}${m.pagado?'':' <span style="color:var(--orange);font-size:11px;font-weight:700">· pendiente</span>'}</p>
          ${m.categoria?'<p class="muted">'+esc2(m.categoria)+'</p>':''}
        </div>
        <div style="text-align:right">
          <p style="font-weight:800;color:${color}">${eur(m.importe)}</p>
          <button class="c-del" data-id="${m.id}" style="background:none;border:0;color:var(--red);font-size:11px;font-weight:700;cursor:pointer">borrar</button>
        </div>
      </div>`).join("")}
    </div>`;
  }

  function wire(){
    const $ = id => document.getElementById(id);
    $("c-prev").onclick = async ()=>{ mesSel=mesMas(mesSel,-1); await cargar(); await sembrarFijos(); pintar(); };
    const cn=$("c-next"); if(cn) cn.onclick = async ()=>{ mesSel=mesMas(mesSel,1); await cargar(); await sembrarFijos(); pintar(); };
    $("c-add-in").onclick = ()=>formulario("ingreso");
    $("c-add-gas").onclick = ()=>formulario("gasto");
    $("c-ticket").onclick = leerTicket;
    document.querySelectorAll(".c-del").forEach(b=>b.onclick=async ()=>{
      await sb.from("pastanaga_finanzas").delete().eq("id",parseInt(b.dataset.id));
      await cargar(); pintar();
    });
    document.querySelectorAll(".c-pag").forEach(b=>b.onclick=async ()=>{
      const m = movs.find(x=>x.id===parseInt(b.dataset.id)); if(!m) return;
      await sb.from("pastanaga_finanzas").update({pagado:!m.pagado}).eq("id",m.id);
      await cargar(); pintar();
    });
    if(tkPend){
      $("tk-ok").onclick = async ()=>{
        await sb.from("pastanaga_finanzas").insert({mes:mesSel, tipo:"gasto", fijo:false, pagado:true,
          concepto:$("tk-con").value.trim()||"Compra", categoria:$("tk-cat").value,
          importe:parseFloat($("tk-imp").value)||0, quien:(perfil&&perfil.nombre)||null});
        tkPend=null; await cargar(); pintar();
      };
      $("tk-no").onclick = ()=>{ tkPend=null; pintar(); };
    }
  }

  function formulario(tipo){
    const ov = document.createElement("div");
    ov.className="overlay";
    ov.innerHTML = `<div class="sheet">
      <h2>${tipo==="ingreso"?"Nuevo ingreso":"Nuevo gasto"}</h2>
      <label>Concepto</label>
      <input type="text" id="f-con" placeholder="${tipo==="ingreso"?"Nómina, extras, prima…":"Alquiler, compra, gasolina…"}">
      <label>Importe (€)</label>
      <input type="number" id="f-imp" inputmode="decimal" placeholder="0.00">
      ${tipo==="gasto"?'<label>Categoría</label><select id="f-cat">'+CATS.map(c=>'<option>'+c+'</option>').join("")+'</select>':''}
      <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-weight:600">
        <input type="checkbox" id="f-fijo" style="width:auto"> Es fijo (se copia cada mes)
      </label>
      <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-weight:600">
        <input type="checkbox" id="f-pag" style="width:auto" checked> Ya está ${'{'}tipo==="ingreso"?"ingresado":"pagado"${'}'}
      </label>
      <div id="f-err"></div>
      <div class="row" style="margin-top:16px">
        <button class="btn sm" id="f-ok">Guardar</button>
        <button class="btn sec sm" id="f-x">Cancelar</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.onclick = e => { if(e.target===ov) ov.remove(); };
    ov.querySelector("#f-x").onclick = ()=>ov.remove();
    ov.querySelector("#f-ok").onclick = async ()=>{
      const con = ov.querySelector("#f-con").value.trim();
      const imp = parseFloat(ov.querySelector("#f-imp").value);
      if(!con || !imp || imp<=0){ ov.querySelector("#f-err").innerHTML='<div class="err">Pon concepto e importe válido</div>'; return; }
      await sb.from("pastanaga_finanzas").insert({
        mes:mesSel, tipo, fijo:ov.querySelector("#f-fijo").checked,
        pagado:ov.querySelector("#f-pag").checked,
        concepto:con, categoria:tipo==="gasto"?ov.querySelector("#f-cat").value:null,
        importe:imp, quien:(perfil&&perfil.nombre)||null,
      });
      ov.remove(); await cargar(); pintar();
    };
  }

  const P_TICKET_FIN = 'Lee este ticket o recibo de compra. Devuelve SOLO JSON válido sin markdown: {"concepto":"nombre corto del comercio o compra","importe":0,"categoria":"una de: Casa,Súper,Recibos,Ocio,Coche,Salud,Otros"}. importe es el TOTAL pagado en euros (número). Si no es un ticket: {"concepto":"","importe":0,"categoria":""}';

  async function leerTicket(){
    if(typeof pedirImagen!=="function"){ err="La cámara no está disponible aquí"; pintar(); return; }
    pedirImagen(async b64=>{
      err=""; cargando=true; pintar();
      try{
        const r = await gemini([{inline_data:{mime_type:"image/jpeg",data:b64}},{text:P_TICKET_FIN}]);
        if(!r.importe){ err="No he podido leer el importe. Enfoca el total del ticket."; }
        else tkPend = r;
      }catch(e){ err = e.message || "Error leyendo el ticket"; }
      cargando=false; pintar();
    });
  }
})();