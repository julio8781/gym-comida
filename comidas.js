/* ============================================================
   PASTANAGA · módulo Comidas 🍳
   Recetas fáciles (freidora de aire y robot Mambo de Cecotec) y un
   plan de batch cooking para dejar los tuppers de la semana hechos.
   Las recetas están aquí escritas (no se piden a ninguna IA): siempre
   iguales y sin esperar. Los ingredientes usan los mismos nombres que
   la lista saludable de Compra, para poder pasarlos a la lista.
   Autónomo, como cuentas.js: se apoya en sb, esc() y el div #app.

   Expone: window.renderComidas()
============================================================ */
(function(){
  const APARATOS = {
    freidora: "🌀 Freidora de aire",
    mambo:    "🤖 Mambo",
    sarten:   "🍳 Sartén",
    frio:     "🥗 Sin cocinar",
  };

  // kcal y proteína: aproximadas, por ración
  const RECETAS = [
    { id:"pollo_crujiente", nombre:"Pollo crujiente", aparato:"freidora", min:20, kcal:380, prot:50,
      ing:["Pechuga de pollo","Huevos","Copos de avena"],
      cant:["1 pechuga (200 g) en tiras","1 huevo","3 cucharadas de copos de avena triturados","sal, pimentón y ajo en polvo"],
      pasos:["Bate el huevo con sal y especias.","Pasa las tiras por el huevo y luego por la avena triturada.","Freidora a 180 °C, 12 min. Dales la vuelta a mitad."],
      truco:"Con un poco de aceite en spray quedan más doradas." },
    { id:"salmon_verduras", nombre:"Salmón con verduras", aparato:"freidora", min:15, kcal:450, prot:35,
      ing:["Salmón","Calabacín","Pimientos","Limones"],
      cant:["1 lomo de salmón (150 g)","½ calabacín en rodajas","½ pimiento en tiras","zumo de limón, sal y pimienta"],
      pasos:["Pon las verduras abajo y el salmón encima.","Freidora a 180 °C, 12 min.","Un chorrito de limón al sacarlo."],
      truco:"No le des la vuelta al salmón: se rompe." },
    { id:"patatas", nombre:"Patatas «fritas» sin freír", aparato:"freidora", min:25, kcal:200, prot:4,
      ing:["Patatas","Aceite de oliva virgen extra"],
      cant:["1 patata grande en bastones","1 cucharadita de aceite","sal y pimentón"],
      pasos:["Deja los bastones 10 min en agua fría y sécalos bien.","Mézclalos con el aceite y las especias.","Freidora a 200 °C, 18-20 min, agitando la cesta cada 5 min."],
      truco:"Secarlas bien es lo que las hace crujientes." },
    { id:"verduras_asadas", nombre:"Verduras asadas", aparato:"freidora", min:15, kcal:120, prot:5,
      ing:["Brócoli","Calabacín","Cebolla","Aceite de oliva virgen extra"],
      cant:["½ brócoli en ramitos","½ calabacín","½ cebolla","1 cucharadita de aceite, sal y especias"],
      pasos:["Corta todo en trozos parecidos.","Mézclalo con el aceite y las especias.","Freidora a 190 °C, 10-12 min, agitando a mitad."],
      truco:"Acompaña a cualquier carne o pescado: llena mucho con muy pocas calorías." },
    { id:"huevos_cocidos", nombre:"Huevos cocidos sin agua", aparato:"freidora", min:15, kcal:150, prot:13,
      ing:["Huevos"],
      cant:["2 huevos (los que quieras)"],
      pasos:["Mete los huevos tal cual en la cesta.","Freidora a 150 °C, 14 min.","Pásalos a agua fría 5 min y pélalos."],
      truco:"Haz 6 de golpe: aguantan 5 días en la nevera para picar o cenar." },
    { id:"pizza_molde", nombre:"Pizza rápida de pan de molde", aparato:"freidora", min:8, kcal:320, prot:28,
      ing:["Pan de molde integral","Tomate triturado","Pechuga de pavo en lonchas","Queso fresco de Burgos"],
      cant:["2 rebanadas de pan integral","2 cucharadas de tomate triturado","4 lonchas de pavo","50 g de queso fresco desmenuzado","orégano"],
      pasos:["Tomate, pavo y queso encima del pan.","Orégano por encima.","Freidora a 180 °C, 5 min."],
      truco:"Para cuando apetece guarrada: sabe a pizza y es casi la mitad de calorías." },
    { id:"lentejas", nombre:"Lentejas con verduras", aparato:"mambo", min:30, kcal:400, prot:24,
      ing:["Lentejas cocidas","Tomate triturado","Cebolla","Pimientos","Patatas","Aceite de oliva virgen extra"],
      cant:["1 bote de lentejas cocidas (400 g) escurridas","½ cebolla","½ pimiento","1 patata pequeña","3 cucharadas de tomate triturado","1 cucharada de aceite, pimentón, comino","300 ml de agua"],
      pasos:["Trocea cebolla y pimiento: velocidad 5, 5 s.","Añade el aceite y sofríe: 120 °C, 5 min, velocidad 1.","Añade tomate, patata en dados, especias y agua: 100 °C, 15 min, velocidad 1, giro inverso.","Añade las lentejas: 100 °C, 5 min, velocidad 1, giro inverso."],
      truco:"Salen 2 raciones: una para hoy y otra para un tupper." },
    { id:"crema_calabacin", nombre:"Crema de calabacín", aparato:"mambo", min:25, kcal:150, prot:8,
      ing:["Calabacín","Cebolla","Patatas","Queso fresco batido 0 %"],
      cant:["2 calabacines","½ cebolla","1 patata pequeña","2 cucharadas de queso batido 0 %","sal y agua hasta cubrir la mitad"],
      pasos:["Trocea todo en la jarra con el agua y la sal.","100 °C, 20 min, velocidad 1.","Añade el queso batido y tritura: velocidad 5 a 10 subiendo poco a poco, 1 min."],
      truco:"Cena perfecta con una tortilla de claras o un huevo cocido." },
    { id:"arroz_mambo", nombre:"Arroz suelto", aparato:"mambo", min:25, kcal:350, prot:7,
      ing:["Arroz"],
      cant:["100 g de arroz por persona","1 litro de agua y sal"],
      pasos:["Agua y sal en la jarra; el arroz lavado en el cestillo.","100 °C, 18 min, velocidad 4.","Sácalo y déjalo escurrir en el cestillo."],
      truco:"Base de casi todos los tuppers: haz para 3-4 días." },
    { id:"revuelto_claras", nombre:"Revuelto de claras con pavo", aparato:"sarten", min:8, kcal:250, prot:35,
      ing:["Claras de huevo (brick)","Huevos","Pechuga de pavo en lonchas","Bolsa de ensalada"],
      cant:["150 ml de claras","1 huevo","4 lonchas de pavo en tiras","un puñado de espinacas o ensalada"],
      pasos:["Saltea el pavo y las espinacas 2 min en sartén antiadherente.","Echa claras y huevo batidos.","Remueve 2-3 min hasta que cuaje."],
      truco:"La cena de 5 minutos con más proteína." },
    { id:"bowl_skyr", nombre:"Bowl de skyr, avena y plátano", aparato:"frio", min:3, kcal:400, prot:30,
      ing:["Yogur griego natural o skyr","Copos de avena","Plátanos","Crema de cacahuete 100 %"],
      cant:["250 g de skyr","40 g de copos de avena","1 plátano","1 cucharadita de crema de cacahuete"],
      pasos:["Skyr en un bol.","Avena y plátano en rodajas por encima.","La crema de cacahuete al final."],
      truco:"Desayuno o merienda que quita el hambre hasta la comida." },
    { id:"ensalada_atun", nombre:"Ensalada de atún y garbanzos", aparato:"frio", min:5, kcal:420, prot:35,
      ing:["Atún al natural (latas)","Garbanzos cocidos","Tomates","Pepino","Cebolla","Aceite de oliva virgen extra"],
      cant:["2 latas de atún al natural","½ bote de garbanzos escurridos","1 tomate","½ pepino","un trozo de cebolla","1 cucharadita de aceite, sal y vinagre"],
      pasos:["Trocea tomate, pepino y cebolla.","Mezcla con los garbanzos y el atún escurridos.","Aliña al servir."],
      truco:"Aguanta bien en tupper: aliña justo antes de comer." },
  ];

  // Batch cooking del domingo: 5 comidas para 1 persona (x2 si también es para Roney)
  const BATCH = {
    titulo: "Domingo de tuppers · 5 comidas en ~1 h 30",
    ing: ["Arroz","Pechuga de pollo","Brócoli","Pimientos","Calabacín","Cebolla","Lentejas cocidas","Tomate triturado","Patatas","Huevos","Aceite de oliva virgen extra"],
    cant: ["300 g de arroz","1 kg de pechuga de pollo","1 brócoli","2 pimientos","1 calabacín","2 cebollas","2 botes de lentejas cocidas","1 brick de tomate triturado","1 patata","6 huevos","aceite, sal y especias (pimentón, ajo, curry…)"],
    pasos: [
      ["0:00", "🤖 Mambo", "Arroz para 3 días: 300 g en el cestillo, 1 l de agua, 100 °C, 18 min, velocidad 4."],
      ["0:05", "🌀 Freidora", "Pollo en dados con sal, pimentón y ajo: 180 °C, 15 min, agitando a mitad. Si no cabe todo, en dos tandas."],
      ["0:25", "🌀 Freidora", "Verduras (brócoli, pimiento, calabacín, cebolla) con 1 cucharadita de aceite: 190 °C, 12 min."],
      ["0:30", "🤖 Mambo", "Saca el arroz y haz las lentejas con verduras (receta de Fáciles, el doble)."],
      ["0:40", "🌀 Freidora", "6 huevos: 150 °C, 14 min y a agua fría."],
      ["1:00", "🥡 Montar", "Lunes, martes y miércoles: arroz + pollo + verduras. Jueves y viernes: lentejas. Huevos para cenas o meriendas."],
      ["1:15", "❄️ Guardar", "Lunes a miércoles a la nevera. Jueves y viernes al congelador: pásalos a la nevera la noche antes."],
    ],
    trucos: [
      "En la nevera aguantan 3-4 días; por eso los de jueves y viernes van al congelador.",
      "Cambia la especia del pollo cada semana (curry, fajitas, limón y pimienta) para no aburrirte.",
      "Deja que se enfríen antes de cerrar los tuppers.",
    ],
  };

  let sub = "faciles", filtro = "todas", abierta = null, aviso = "";

  // Pasa ingredientes a la lista de la compra (sin repetir los que ya están)
  async function aLaCompra(nombres){
    const {data} = await sb.from("pastanaga_lista").select("id,nombre,comprado");
    const hay = new Map((data||[]).map(x => [x.nombre.toLowerCase(), x]));
    const nuevos = nombres.filter(n => !hay.has(n.toLowerCase()));
    // los que ya están pero marcados como comprados, se vuelven a poner por comprar
    const reactivar = nombres.map(n => hay.get(n.toLowerCase())).filter(x => x && x.comprado);
    if(nuevos.length) await sb.from("pastanaga_lista").insert(nuevos.map(n => ({nombre: n})));
    for(const x of reactivar) await sb.from("pastanaga_lista").update({comprado: false}).eq("id", x.id);
    const yaEstaban = nombres.length - nuevos.length - reactivar.length;
    aviso = `🛒 ${nuevos.length + reactivar.length} a la lista` + (yaEstaban ? ` · ${yaEstaban} ya estaban` : "");
    pintar();
    setTimeout(() => { aviso = ""; if(vista === "comidas") pintar(); }, 3500);
  }

  function tarjetaReceta(r){
    const ab = abierta === r.id;
    return `
    <div class="card cm-rec">
      <button class="cm-cab" data-rec="${r.id}">
        <div style="flex:1;text-align:left">
          <p class="cm-nom">${esc(r.nombre)}</p>
          <p class="muted cm-meta">${APARATOS[r.aparato]} · ⏱ ${r.min} min</p>
        </div>
        <div class="cm-num"><b>${r.kcal}</b><span>kcal</span></div>
        <div class="cm-num"><b>${r.prot} g</b><span>prot.</span></div>
      </button>
      ${ab ? `
      <div class="cm-det">
        <p class="cm-sub">Ingredientes (1 ración)</p>
        <ul>${r.cant.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
        <p class="cm-sub">Cómo se hace</p>
        <ol>${r.pasos.map(p => `<li>${esc(p)}</li>`).join("")}</ol>
        ${r.truco ? `<p class="cm-truco">💡 ${esc(r.truco)}</p>` : ""}
        <button class="btn sec sm cm-compra" data-ing="${r.id}" style="margin-top:10px">🛒 Añadir ingredientes a la compra</button>
      </div>` : ""}
    </div>`;
  }

  function pintar(){
    const app = document.getElementById("app");
    const lista = RECETAS.filter(r => filtro === "todas" || r.aparato === filtro);
    app.innerHTML = `
    <div class="topbar"><h1>Comidas 🍳</h1></div>
    <div class="seg" style="margin-bottom:12px">
      <button data-cs="faciles" class="${sub==="faciles"?"on":""}">🍳 Fáciles</button>
      <button data-cs="tuppers" class="${sub==="tuppers"?"on":""}">🥡 Tuppers</button>
    </div>
    ${aviso ? `<div class="ok" style="margin-bottom:10px">${aviso}</div>` : ""}

    ${sub === "faciles" ? `
    <div class="cm-filtros">
      ${[["todas","Todas"], ...Object.entries(APARATOS)].map(([k,t]) => `<button data-cf="${k}" class="${filtro===k?"on":""}">${t}</button>`).join("")}
    </div>
    <p class="muted" style="margin:0 0 10px;font-size:12px">kcal y proteína aproximadas por ración. Toca una receta para verla.</p>
    ${lista.map(tarjetaReceta).join("")}
    ` : `
    <div class="card">
      <h2>${BATCH.titulo}</h2>
      <p class="muted" style="margin-top:4px">Cantidades para ti solo; si también es para Roney, el doble.</p>
      <p class="cm-sub">Qué necesitas</p>
      <ul class="cm-lista">${BATCH.cant.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
      <button class="btn sec sm" id="cm-batch-compra" style="margin-top:6px">🛒 Añadir todo a la compra</button>
    </div>
    <div class="card">
      <h2>Paso a paso</h2>
      <div class="cm-pasos">
        ${BATCH.pasos.map(([t, quien, que]) => `
        <div class="cm-paso"><span class="cm-t">${t}</span><div><b>${quien}</b><p>${esc(que)}</p></div></div>`).join("")}
      </div>
    </div>
    <div class="card">
      <h2>Trucos</h2>
      <ul class="cm-lista">${BATCH.trucos.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
    </div>`}`;

    document.querySelectorAll("[data-cs]").forEach(b => b.onclick = () => { sub = b.dataset.cs; pintar(); });
    document.querySelectorAll("[data-cf]").forEach(b => b.onclick = () => { filtro = b.dataset.cf; abierta = null; pintar(); });
    document.querySelectorAll("[data-rec]").forEach(b => b.onclick = () => { abierta = abierta === b.dataset.rec ? null : b.dataset.rec; pintar(); });
    document.querySelectorAll("[data-ing]").forEach(b => b.onclick = () => aLaCompra(RECETAS.find(r => r.id === b.dataset.ing).ing));
    const bc = document.getElementById("cm-batch-compra");
    if(bc) bc.onclick = () => aLaCompra(BATCH.ing);
  }

  window.renderComidas = function(){ pintar(); };
})();
