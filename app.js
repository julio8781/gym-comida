const SB_URL = "https://kepdacdtqffhkhaswqsk.supabase.co";
const SB_KEY = "sb_publishable_6a4q6zi8Uojdg-GmWCflGg_66FiNDNE";

const sb = (SB_URL.startsWith("https") && window.supabase)
  ? window.supabase.createClient(SB_URL, SB_KEY) : null;

const pad = n => String(n).padStart(2,"0");
const hoy = () => { const d = new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); };
const addDias = (f,n) => { const d = new Date(f+"T12:00:00"); d.setDate(d.getDate()+n); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); };
const fechaLarga = f => new Date(f+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
const esc = s => String(s??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const protObjetivo = p => Math.round(p.peso * 1.6);   // g de proteína al día (1.6 g/kg, ideal en déficit)

let uid = null;
let perfil = null, parejaPerfil = null;
let verUser = null;            // de quién estamos viendo el diario
let fechaSel = hoy();          // qué día estamos viendo
let entradas = [];
let vista = "diario";
let pendiente = null, producto = null, cargando = false, errorMsg = "";
let fotoPend = null;   // base64 de la foto pendiente de confirmar
let compartidasPend = [];  // comidas que la pareja te ha compartido
let entAbierta = null;     // id de la entrada desplegada
let sugerencias = null;    // opciones de "¿Qué ceno?"
let sugPrevias = [];       // nombres ya sugeridos (para no repetir)
let semana = null;         // balance de los últimos 7 días
let subCompra = "lista";   // sub-pestaña de Compra: lista | despensa | escaner
let lista = [];            // lista de la compra compartida
let despensa = [];         // despensa compartida
let ticketPend = null;     // artículos leídos del ticket, pendientes de confirmar
let reacciones = {};       // comida_id -> {mia:'up'|'down', otra:'up'|'down'}
let diaGym = "A";
let gymUser = null;        // de quién estamos viendo el gym
let fechaGym = hoy();      // qué día del registro estamos viendo
let sesionG = null;        // sesión registrada de ese día: {dia, registro:{ejercicios:[{id,hecho,kg}]}}
let modoEditar = false;    // editando la rutina plantilla
let bibAbierta = false;    // biblioteca de ejercicios abierta
let obTmp = {sexo:"h", ritmo:"400"};
let puntosCache = null;

const GRUPOS = ["En casa","Pecho","Espalda","Pierna","Hombro","Bíceps","Tríceps","Core","Cardio"];
const BIB = {
  flexiones:{n:"Flexiones",m:"En casa",s:"3 × máximo",p:0,tips:["Cuerpo en línea recta, abdomen apretado","Si no salen, apoya las rodillas y a subir de nivel"]},
  sentadilla_aire:{n:"Sentadilla sin peso",m:"En casa",s:"3 × 15",p:0,tips:["Baja hasta muslos paralelos al suelo","Talones siempre pegados al suelo"]},
  fondos_silla:{n:"Fondos en silla (tríceps)",m:"En casa",s:"3 × 12",p:0,tips:["Manos en el borde de la silla, codos hacia atrás","Baja hasta 90º, no más"]},
  burpees:{n:"Burpees",m:"En casa",s:"3 × 10",p:0,tips:["Ritmo constante, mejor lento que mal hecho","Aterriza suave doblando rodillas"]},
  mountain_climbers:{n:"Mountain climbers",m:"En casa",s:"3 × 30 seg",p:0,tips:["Cadera baja, como en plancha","Rodillas al pecho alternando rápido"]},
  puente_gluteo:{n:"Puente de glúteo",m:"En casa",s:"3 × 15",p:0,tips:["Aprieta el glúteo arriba 1 segundo","Empuja con los talones, no con la punta"]},
  superman:{n:"Superman (lumbar)",m:"En casa",s:"3 × 12",p:0,tips:["Boca abajo, levanta brazos y piernas a la vez","Movimiento suave, sin tirones"]},
  abdominal_bicicleta:{n:"Abdominal bicicleta",m:"En casa",s:"3 × 20",p:0,tips:["Codo hacia la rodilla contraria","No tires del cuello con las manos"]},
  press_banca:{n:"Press banca",m:"Pecho",s:"3 × 8-10",p:1,tips:["Baja la barra al pecho con control, sin rebotar","Pies firmes en el suelo y escápulas juntas"]},
  press_inclinado:{n:"Press inclinado con mancuernas",m:"Pecho",s:"3 × 10",p:1,tips:["Banco a 30-45º, no más","Baja hasta sentir el estiramiento del pecho"]},
  aperturas:{n:"Aperturas con mancuernas",m:"Pecho",s:"3 × 12",p:1,tips:["Codos ligeramente flexionados todo el rato","Movimiento de abrazo, no de press"]},
  fondos:{n:"Fondos en paralelas",m:"Pecho",s:"3 × máximo",p:0,tips:["Inclínate hacia delante para dar más pecho","Si no llegas, usa la máquina asistida"]},
  jalon_pecho:{n:"Jalón al pecho",m:"Espalda",s:"3 × 10",p:1,tips:["Tira con los codos, no con los brazos","Lleva la barra a la parte alta del pecho"]},
  remo_mancuerna:{n:"Remo con mancuerna",m:"Espalda",s:"3 × 10",p:1,tips:["Espalda recta apoyado en el banco","Lleva el codo hacia la cadera, no hacia fuera"]},
  remo_maquina:{n:"Remo en máquina",m:"Espalda",s:"3 × 10",p:1,tips:["Pecho pegado al soporte","Aprieta las escápulas al final del recorrido"]},
  dominadas:{n:"Dominadas (o asistidas)",m:"Espalda",s:"3 × máximo",p:0,tips:["Barbilla por encima de la barra","Baja del todo, sin medias repeticiones"]},
  sentadilla:{n:"Sentadilla (barra o máquina)",m:"Pierna",s:"3 × 8-10",p:1,tips:["Baja hasta muslos paralelos al suelo","Rodillas siguiendo la punta de los pies"]},
  peso_muerto:{n:"Peso muerto rumano",m:"Pierna",s:"3 × 8-10",p:1,tips:["Espalda SIEMPRE recta, la barra pegada al cuerpo","Baja empujando la cadera atrás, no doblando rodillas"]},
  prensa:{n:"Prensa de piernas",m:"Pierna",s:"3 × 10",p:1,tips:["No bloquees las rodillas arriba","Baja hasta 90º sin despegar el lumbar"]},
  zancadas:{n:"Zancadas",m:"Pierna",s:"3 × 10/pierna",p:1,tips:["Paso largo, rodilla trasera casi al suelo","Torso vertical, sin inclinarte"]},
  curl_femoral:{n:"Curl femoral tumbado",m:"Pierna",s:"3 × 12",p:1,tips:["Cadera pegada al banco","Sube rápido, baja lento"]},
  extension_cuadriceps:{n:"Extensión de cuádriceps",m:"Pierna",s:"3 × 12",p:1,tips:["Aguanta 1 segundo arriba","No des tirones con el peso"]},
  gemelos:{n:"Elevación de gemelos",m:"Pierna",s:"3 × 15",p:1,tips:["Sube hasta la punta del todo","Estira bien abajo en cada repetición"]},
  press_militar:{n:"Press militar (hombros)",m:"Hombro",s:"3 × 8-10",p:1,tips:["Aprieta el abdomen para no arquear la espalda","La barra sube pegada a la cara"]},
  elevaciones_laterales:{n:"Elevaciones laterales",m:"Hombro",s:"3 × 12",p:1,tips:["Peso ligero y sin balanceo","Sube hasta la altura de los hombros, no más"]},
  pajaros:{n:"Pájaros (deltoide posterior)",m:"Hombro",s:"3 × 12",p:1,tips:["Torso inclinado, espalda recta","Abre como si volaras, codos algo doblados"]},
  curl_biceps:{n:"Curl de bíceps",m:"Bíceps",s:"3 × 12",p:1,tips:["Codos pegados al cuerpo, quietos","No balancees el cuerpo para subir el peso"]},
  curl_martillo:{n:"Curl martillo",m:"Bíceps",s:"3 × 12",p:1,tips:["Agarre neutro, palmas enfrentadas","Trabaja también el antebrazo"]},
  triceps_polea:{n:"Extensión de tríceps en polea",m:"Tríceps",s:"3 × 12",p:1,tips:["Codos fijos pegados al cuerpo","Extiende del todo y controla la subida"]},
  press_frances:{n:"Press francés",m:"Tríceps",s:"3 × 10",p:1,tips:["Solo se mueve el antebrazo","Baja la barra a la frente con control"]},
  plancha:{n:"Plancha",m:"Core",s:"3 × 30-45 seg",p:0,tips:["Cuerpo en línea recta, sin subir el culo","Aprieta abdomen y glúteo todo el rato"]},
  plancha_lateral:{n:"Plancha lateral",m:"Core",s:"3 × 20-30 seg/lado",p:0,tips:["Cadera arriba, sin dejarla caer","Codo justo debajo del hombro"]},
  elevaciones_piernas:{n:"Elevaciones de piernas",m:"Core",s:"3 × 10",p:0,tips:["Baja las piernas sin arquear el lumbar","Si es fácil, hazlas colgado de la barra"]},
  crunch_polea:{n:"Crunch en polea",m:"Core",s:"3 × 12",p:1,tips:["Enrolla el tronco, no tires con los brazos","Exhala al bajar"]},
  rueda:{n:"Rueda abdominal",m:"Core",s:"3 × 10",p:0,tips:["Avanza solo hasta donde controles","Abdomen apretado para proteger el lumbar"]},
  cardio_suave:{n:"Piscina o cinta (ritmo suave)",m:"Cardio",s:"20-30 min",p:0,tips:["Ritmo al que puedas hablar","Lo importante es sumar minutos, no reventar"]},
};
const RUTINA_DEF = {
  A:["sentadilla","press_banca","remo_mancuerna","plancha","elevaciones_piernas"],
  B:["peso_muerto","press_militar","jalon_pecho","crunch_polea","plancha_lateral"],
  C:["cardio_suave","zancadas","curl_biceps","triceps_polea","plancha"],
  D:["flexiones","sentadilla_aire","zancadas","puente_gluteo","plancha","burpees"],
};
const NOTAS_DIA = {
  A:"Full body · descansa 90 seg entre series · deja 2 reps en el tanque",
  B:"Full body · descansa 90 seg · sube peso cuando completes todas las reps",
  C:"Día opcional · cardio + core + brazos · si solo puedes 2 días, sáltalo sin culpa",
  D:"Rutina en casa · sin material ni gimnasio · descansa 60-90 seg entre series",
};
const rutinaDe = p => {
  const r = (p && p.rutina) || RUTINA_DEF;
  if(r !== RUTINA_DEF && !r.D) r.D = [...RUTINA_DEF.D];
  return r;
};
const NOMBRES_DEF = {A:"Full body 1", B:"Full body 2", C:"Cardio y brazos", D:"En casa"};
const nombreRutina = (p,k) => (p && p.rutina && p.rutina.nombres && p.rutina.nombres[k]) || NOMBRES_DEF[k];
function materializarRutina(){
  if(!perfil.rutina) perfil.rutina = JSON.parse(JSON.stringify(RUTINA_DEF));
  if(!perfil.rutina.nombres) perfil.rutina.nombres = {...NOMBRES_DEF};
}

const MODELOS = ["gemini-3.5-flash","gemini-2.5-flash","gemini-flash-latest"];
const espera = ms => new Promise(r=>setTimeout(r,ms));

async function gemini(parts){
  let ultimo = null;
  for(const modelo of MODELOS){
    for(let intento = 0; intento < 2; intento++){
      let r;
      try{
        r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+modelo+":generateContent?key="+encodeURIComponent(perfil.apikey),{
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({contents:[{parts}], generationConfig:{temperature:0.2}})
        });
      }catch(e){ ultimo = new Error("Sin conexión con Gemini"); await espera(1200); continue; }
      if(r.ok){
        const data = await r.json();
        const texto = (data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("");
        return JSON.parse(texto.replace(/```json|```/g,"").trim());
      }
      if(r.status===400||r.status===403) throw new Error("Clave de Gemini no válida. Revísala en Ajustes ⚙️");
      if(r.status===429){ ultimo = new Error("Demasiadas peticiones, espera un momento"); await espera(2500); continue; }
      ultimo = new Error("Error del servidor de Gemini ("+r.status+")");
      await espera(1200);
    }
  }
  throw ultimo || new Error("Gemini no responde ahora mismo, prueba en un rato");
}
const P_COMIDA = 'Eres un nutricionista. Analiza la comida y estima calorías y macros de forma realista para raciones típicas en España. Responde SOLO con JSON válido, sin markdown ni backticks ni texto extra, estructura exacta: {"alimentos":[{"nombre":"","kcal":0,"proteina_g":0,"carbs_g":0,"grasa_g":0}],"total_kcal":0,"comentario":"máx 15 palabras, tono cercano"}. Si no hay comida reconocible: {"alimentos":[],"total_kcal":0,"comentario":"No veo comida ahí"}';
const P_PRODUCTO = 'Eres un nutricionista que evalúa productos de supermercado al estilo de la app Yuka. Analiza la foto del producto (envase, ingredientes o tabla nutricional). Valora azúcares, grasas saturadas, sal, aditivos, ultraprocesado y calidad de ingredientes. Responde SOLO con JSON válido sin markdown: {"nombre":"","puntuacion":0,"nivel":"malo|mediocre|bueno|excelente","positivos":["hasta 3, cortos"],"negativos":["hasta 3, cortos"],"alternativa":"alternativa más sana de súper español o vacío","kcal_100g":0}. Puntuación 0-100: 0-24 malo, 25-49 mediocre, 50-74 bueno, 75-100 excelente. Si no reconoces producto: {"nombre":"","puntuacion":-1,"nivel":"","positivos":[],"negativos":[],"alternativa":"","kcal_100g":0}';

const P_TICKET = 'Lee este ticket de supermercado. Devuelve SOLO JSON válido sin markdown: {"articulos":["nombre corto y normalizado",...]}. Solo los artículos (comida y productos), sin precios ni cantidades, nombres cortos tipo "Pechuga de pollo", "Yogur griego". Si la imagen no es un ticket: {"articulos":[]}';

async function pedirSugerencias(rest, protFalta){
  const {data:d} = await sb.from("pastanaga_despensa").select("nombre");
  const enCasa = (d||[]).map(x=>x.nombre);
  const evitar = sugPrevias.length ? ' NO repitas ni propongas nada parecido a estas ya sugeridas: '+sugPrevias.join(", ")+'.' : '';
  const despTxt = enCasa.length
    ? ' EN CASA HAY EXACTAMENTE ESTO: '+enCasa.join(", ")+'. PRIORIDAD ABSOLUTA: las primeras opciones deben poder hacerse SOLO con lo que hay en casa (más básicos de cualquier cocina: aceite, sal, especias). Solo si no da para 3 opciones, propón alguna que necesite comprar algo, listando en "faltan" únicamente lo que NO está en casa. Ordena: primero las de despensa.'
    : ' La despensa está vacía o sin registrar, así que propón cosas sencillas de conseguir y lista sus ingredientes en "faltan".';
  const prompt = 'Eres un nutricionista especializado en comidas RÁPIDAS y FÁCILES: máximo 20 minutos, ingredientes normales de supermercado español, sin técnicas complicadas ni utensilios raros. Propón exactamente 3 opciones de comida distintas entre sí que quepan en '+rest+' kcal como máximo cada una'+(protFalta>0?' y que aporten mucha proteína (hoy faltan '+protFalta+' g)':'')+'.'+despTxt+evitar+' Responde SOLO con JSON válido, sin markdown ni backticks: {"opciones":[{"nombre":"","desc":"cómo se prepara, en 1 frase","kcal":0,"proteina_g":0,"tiempo_min":0,"de_despensa":true,"faltan":[]}]} donde de_despensa=true solo si se hace íntegramente con lo de casa, y faltan lista lo que habría que comprar (vacío si nada).';
  return gemini([{text:prompt}]);
}


async function redimensionar(file){
  const max = 896;
  if (window.createImageBitmap) {
    try {
      const bmp = await createImageBitmap(file, { resizeWidth: max, resizeQuality: "medium" });
      const c = document.createElement("canvas");
      c.width = bmp.width; c.height = bmp.height;
      c.getContext("2d").drawImage(bmp, 0, 0);
      bmp.close();
      return c.toDataURL("image/jpeg", .72).split(",")[1];
    } catch (e) {  }
  }
  return new Promise((res,rej)=>{
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = ()=>{
      let w=img.width, h=img.height;
      if(w>max||h>max){const s=max/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s);}
      const c=document.createElement("canvas"); c.width=w; c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg",.72).split(",")[1]);
    };
    img.onerror=()=>{URL.revokeObjectURL(url); rej(new Error("No se pudo leer la imagen"));};
    img.src=url;
  });
}

function pedirImagen(cb){
  const ov = document.createElement("div");
  ov.className = "overlay"; ov.style.alignItems = "center";
  ov.innerHTML = `
  <div style="background:#000;border-radius:22px;width:calc(100% - 24px);max-width:480px;overflow:hidden">
    <video id="cam-v" autoplay playsinline muted style="width:100%;display:block;max-height:68vh;object-fit:cover;background:#111"></video>
    <div style="display:flex;gap:10px;padding:14px;background:#000">
      <button id="cam-x" style="flex:1;background:#333;color:#fff;border:0;border-radius:12px;padding:13px;font-weight:700;font-size:15px">✕</button>
      <button id="cam-go" style="flex:2;background:var(--carrot);color:#fff;border:0;border-radius:12px;padding:13px;font-weight:800;font-size:16px">📸 Capturar</button>
      <button id="cam-gal" style="flex:1;background:#333;color:#fff;border:0;border-radius:12px;padding:13px;font-weight:700;font-size:15px">🖼️</button>
    </div>
  </div>
  <input type="file" accept="image/*" id="cam-file" class="hide">`;
  document.body.appendChild(ov);
  const video = ov.querySelector("#cam-v");
  const fileInp = ov.querySelector("#cam-file");
  let stream = null;
  const cerrar = ()=>{ try{ if(stream) stream.getTracks().forEach(t=>t.stop()); }catch(e){} ov.remove(); };
  const usarGaleria = ()=>fileInp.click();
  fileInp.onchange = async e=>{
    const f = e.target.files[0]; if(!f){ return; }
    try{ const b64 = await redimensionar(f); cerrar(); cb(b64); }
    catch(x){ cerrar(); errorMsg = "No se pudo leer la imagen"; render(); }
  };
  ov.querySelector("#cam-x").onclick = cerrar;
  ov.querySelector("#cam-gal").onclick = usarGaleria;
  ov.querySelector("#cam-go").onclick = ()=>{
    if(!stream || !video.videoWidth) return usarGaleria();
    const max = 896; let w = video.videoWidth, h = video.videoHeight;
    if(w>max||h>max){ const s = max/Math.max(w,h); w = Math.round(w*s); h = Math.round(h*s); }
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(video, 0, 0, w, h);
    const b64 = c.toDataURL("image/jpeg", .72).split(",")[1];
    cerrar(); cb(b64);
  };
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    navigator.mediaDevices.getUserMedia({
      video: {facingMode:{ideal:"environment"}, width:{ideal:1280}, height:{ideal:1280}},
      audio: false,
    }).then(s=>{ stream = s; video.srcObject = s; })
      .catch(()=>{ usarGaleria(); });
  } else usarGaleria();
}

function calcularObjetivo(d){
  const tmb = 10*d.peso + 6.25*d.altura - 5*d.edad + (d.sexo==="h" ? 5 : -161);
  return Math.round((tmb * parseFloat(d.actividad) - parseInt(d.ritmo)) / 10) * 10;
}

async function cargarPerfiles(){
  const {data:ps} = await sb.from("pastanaga_perfiles").select();
  perfil = (ps||[]).find(p=>p.user_id===uid) || null;
  parejaPerfil = (ps||[]).find(p=>p.user_id!==uid) || null;
  verUser = uid;
}
async function cargarDia(){
  const {data:c} = await sb.from("pastanaga_comidas").select()
    .eq("user_id",verUser).eq("fecha",fechaSel).order("id");
  entradas = c || [];
  reacciones = {};
  const ids = entradas.map(e=>e.id);
  if(ids.length){
    const {data:r} = await sb.from("pastanaga_reacciones").select().in("comida_id",ids);
    (r||[]).forEach(x=>{
      reacciones[x.comida_id] = reacciones[x.comida_id] || {};
      reacciones[x.comida_id][x.de_user===uid ? "mia" : "otra"] = x.tipo;
    });
  }
  await cargarSemana();
}
async function cargarSemana(){
  const desde = addDias(hoy(),-6);
  const {data} = await sb.from("pastanaga_comidas").select("fecha,kcal,borrada")
    .eq("user_id",verUser).gte("fecha",desde);
  const porDia = {};
  (data||[]).forEach(c=>{ if(!c.borrada) porDia[c.fecha]=(porDia[c.fecha]||0)+c.kcal; });
  const dias = Object.keys(porDia).length;
  if(!dias){ semana = null; return; }
  const total = Object.values(porDia).reduce((a,b)=>a+b,0);
  semana = {dias, total, media: Math.round(total/dias)};
}
async function cargarCompartidas(){
  if(!parejaPerfil){ compartidasPend = []; return; }
  const {data} = await sb.from("pastanaga_compartidas").select().eq("para_user",uid).order("id");
  compartidasPend = data || [];
}
async function cargarGymDia(){
  const {data:g} = await sb.from("pastanaga_gym").select()
    .eq("user_id", gymUser||uid).eq("fecha", fechaGym).maybeSingle();
  if(g && g.registro){ sesionG = {dia:g.dia, registro:g.registro}; diaGym = g.dia; }
  else if(g){
    const ids = RUTINA_DEF[g.dia]||[];
    sesionG = {dia:g.dia, registro:{ejercicios: ids.map((id,i)=>({id, hecho: !!(g.hechos||{})[g.dia+"-"+i], kg:""}))}};
    diaGym = g.dia;
  }
  else sesionG = null;
}
function crearRegistro(dia){
  const ids = (rutinaDe(perfil)[dia]||[]).filter(id=>BIB[id]);
  return {ejercicios: ids.map(id=>({id, hecho:false, kg: String((perfil.pesos||{})[id] ?? (perfil.pesos||{})[BIB[id].n] ?? "")}))};
}
async function guardarSesion(){
  const {error} = await sb.from("pastanaga_gym").upsert({
    user_id: uid, fecha: fechaGym, dia: sesionG.dia, hechos: {}, registro: sesionG.registro,
  });
  if(error){ errorMsg = "No se guardó la sesión: "+error.message; }
}
async function guardarRutina(){
  const {error} = await sb.from("pastanaga_perfiles").update({rutina: perfil.rutina}).eq("user_id",uid);
  if(error){ errorMsg = "No se guardó la rutina: "+error.message; }
}
async function guardarPesos(){
  const {error} = await sb.from("pastanaga_perfiles").update({pesos:perfil.pesos}).eq("user_id",uid);
  if(error){ errorMsg = "No se guardaron los pesos: "+error.message; }
}
async function cargarCompra(){
  const [{data:l},{data:d}] = await Promise.all([
    sb.from("pastanaga_lista").select().order("id"),
    sb.from("pastanaga_despensa").select().order("nombre"),
  ]);
  lista = l || []; despensa = d || [];
}

const app = document.getElementById("app");
const nav = document.getElementById("nav");
nav.querySelectorAll("button").forEach(b=>b.onclick=async ()=>{
  vista=b.dataset.v; errorMsg="";
  if(vista==="diario"){ await cargarDia(); await cargarCompartidas(); }
  if(vista==="compra"){ await cargarCompra(); }
  if(vista==="gym"){ if(!gymUser) gymUser = uid; await cargarGymDia(); }
  render();
});

function render(){
  if(!sb){ renderSinConfig(); return; }
  if(!uid){ renderLogin(); return; }
  if(!perfil){ renderOnboarding(); return; }
  nav.classList.remove("hide");
  nav.querySelectorAll("button").forEach(b=>b.classList.toggle("on", b.dataset.v===vista));
  if(vista==="diario") renderDiario();
  else if(vista==="compra") renderCompra();
  else if(vista==="gym") renderGym();
  else renderPuntos();
}

function renderSinConfig(){
  app.innerHTML = `<div class="card" style="margin-top:40px">
    <h2>⚙️ Falta configurar</h2>
    <p class="muted" style="margin-top:8px">Abre el index.html y pega arriba del todo tu SUPABASE_URL y tu SUPABASE_ANON_KEY.</p>
  </div>`;
}

function renderLogin(){
  nav.classList.add("hide");
  app.innerHTML = `
  <div class="center" style="margin:40px 0 18px">
    <div style="font-size:54px">🥕</div>
    <h1>Pastanaga</h1>
    <p class="muted">Entra con tu cuenta (la misma de Garabato)</p>
  </div>
  <div class="card">
    <label>Email</label>
    <input type="email" id="lg-email" placeholder="tu@email.com" autocomplete="email">
    <label>Contraseña</label>
    <input type="password" id="lg-pass" autocomplete="current-password">
    <div id="lg-err"></div>
    <div style="margin-top:16px"><button class="btn" id="lg-go">Entrar</button></div>
    <div style="margin-top:8px"><button class="btn sec sm" id="lg-nuevo">Crear cuenta nueva</button></div>
  </div>`;
  const err = m => document.getElementById("lg-err").innerHTML = '<div class="err">⚠ '+esc(m)+'</div>';
  document.getElementById("lg-go").onclick = async ()=>{
    const email = document.getElementById("lg-email").value.trim();
    const pass = document.getElementById("lg-pass").value;
    if(!email||!pass) return err("Pon email y contraseña");
    const b=document.getElementById("lg-go"); b.disabled=true; b.textContent="Entrando…";
    const {data, error} = await sb.auth.signInWithPassword({email, password:pass});
    if(error){ b.disabled=false; b.textContent="Entrar"; return err(error.message.includes("Invalid")?"Email o contraseña incorrectos":error.message); }
    uid = data.user.id;
    await cargarPerfiles(); if(perfil){ gymUser = uid; await cargarDia(); await cargarGymDia(); await cargarCompartidas(); }
    render();
  };
  document.getElementById("lg-nuevo").onclick = async ()=>{
    const email = document.getElementById("lg-email").value.trim();
    const pass = document.getElementById("lg-pass").value;
    if(!email||!pass) return err("Escribe arriba el email y la contraseña que quieres, y vuelve a pulsar");
    if(pass.length<6) return err("La contraseña necesita mínimo 6 caracteres");
    const {data, error} = await sb.auth.signUp({email, password:pass});
    if(error) return err(error.message);
    if(data.session){ uid = data.user.id; await cargarPerfiles(); render(); }
    else err("Cuenta creada. Revisa tu email para confirmarla y luego entra.");
  };
}

function renderOnboarding(){
  nav.classList.add("hide");
  app.innerHTML = `
  <div class="center" style="margin:26px 0 18px">
    <div style="font-size:54px">🥕</div>
    <h1>Casi listo</h1>
    <p class="muted">Cuéntame cuatro cosas y te calculo tu objetivo de calorías y proteína.</p>
  </div>
  <div class="card">
    <label>¿Cómo te llamas?</label>
    <input type="text" id="ob-nombre" placeholder="Tu nombre">
    <label>Sexo</label>
    <div class="seg" id="ob-sexo">
      <button data-x="h" class="on">Hombre</button>
      <button data-x="m">Mujer</button>
    </div>
    <div class="row">
      <div><label>Edad</label><input type="number" id="ob-edad" placeholder="30"></div>
      <div><label>Altura (cm)</label><input type="number" id="ob-altura" placeholder="175"></div>
      <div><label>Peso (kg)</label><input type="number" id="ob-peso" placeholder="80" step="0.1"></div>
    </div>
    <label>Tu día a día (sin contar el gym)</label>
    <select id="ob-act">
      <option value="1.2">Sentado casi todo el día</option>
      <option value="1.375" selected>Oficina pero me muevo algo</option>
      <option value="1.55">Bastante activo / trabajo de pie</option>
      <option value="1.725">Muy activo físicamente</option>
    </select>
    <label>Ritmo para perder barriga</label>
    <div class="seg" id="ob-ritmo">
      <button data-x="300">Tranquilo<br><small>-300 kcal</small></button>
      <button data-x="400" class="on">Medio<br><small>-400 kcal</small></button>
      <button data-x="500">A tope<br><small>-500 kcal</small></button>
    </div>
    <label>Clave de API de Gemini (para las fotos)</label>
    <input type="password" id="ob-key" placeholder="AIza...">
    <div id="ob-err"></div>
    <div style="margin-top:16px"><button class="btn" id="ob-go">Calcular mis objetivos →</button></div>
  </div>`;
  document.querySelectorAll("#ob-sexo button").forEach(b=>b.onclick=()=>{obTmp.sexo=b.dataset.x;document.querySelectorAll("#ob-sexo button").forEach(x=>x.classList.toggle("on",x===b));});
  document.querySelectorAll("#ob-ritmo button").forEach(b=>b.onclick=()=>{obTmp.ritmo=b.dataset.x;document.querySelectorAll("#ob-ritmo button").forEach(x=>x.classList.toggle("on",x===b));});
  document.getElementById("ob-go").onclick = async ()=>{
    const d = {
      user_id: uid,
      nombre: document.getElementById("ob-nombre").value.trim(),
      sexo: obTmp.sexo,
      edad: parseInt(document.getElementById("ob-edad").value),
      altura: parseFloat(document.getElementById("ob-altura").value),
      peso: parseFloat(document.getElementById("ob-peso").value),
      actividad: document.getElementById("ob-act").value,
      ritmo: obTmp.ritmo,
      apikey: document.getElementById("ob-key").value.trim(),
      pesos: {},
    };
    const e = document.getElementById("ob-err");
    if(!d.nombre || !d.edad || !d.altura || !d.peso){ e.innerHTML='<div class="err">Faltan datos: nombre, edad, altura y peso</div>'; return; }
    if(d.edad<14||d.edad>100||d.altura<120||d.altura>230||d.peso<35||d.peso>250){ e.innerHTML='<div class="err">Revisa los datos, algo no cuadra</div>'; return; }
    if(!d.apikey){ e.innerHTML='<div class="err">Falta la clave de Gemini (sin ella no hay fotos)</div>'; return; }
    d.objetivo = calcularObjetivo(d);
    const {error} = await sb.from("pastanaga_perfiles").insert(d);
    if(error){ e.innerHTML='<div class="err">Error guardando: '+esc(error.message)+'</div>'; return; }
    perfil = d;
    app.innerHTML = `
    <div class="center" style="margin-top:50px">
      <div style="font-size:54px">🎯</div>
      <h1>${esc(d.nombre)}, tus números</h1>
      <p style="font-size:56px;font-weight:800;color:var(--carrot);letter-spacing:-2px">${d.objetivo} <span style="font-size:20px">kcal</span></p>
      <p style="font-size:30px;font-weight:800;color:var(--green)">${protObjetivo(d)} g <span style="font-size:16px">de proteína</span></p>
      <p class="muted" style="max-width:310px;margin:10px auto 0">Comiendo esas kcal pierdes grasa; llegando a esa proteína conservas el músculo. La app lleva la cuenta de las dos cosas.</p>
      <div style="margin-top:24px"><button class="btn green" id="ob-fin">Empezar 🥕</button></div>
    </div>`;
    document.getElementById("ob-fin").onclick=async ()=>{vista="diario"; await cargarDia(); render();};
  };
}

function renderDiario(){
  const pAct = verUser===uid ? perfil : parejaPerfil;
  const mio = verUser===uid;
  const protT = protObjetivo(pAct);
  const activas = entradas.filter(e=>!e.borrada);
  const total = activas.reduce((s,x)=>s+x.kcal,0);
  const tp = Math.round(activas.reduce((s,x)=>s+(x.proteina||0),0));
  const tc = Math.round(activas.reduce((s,x)=>s+(x.carbs||0),0));
  const tg = Math.round(activas.reduce((s,x)=>s+(x.grasa||0),0));
  const rest = pAct.objetivo - total;
  const pct = Math.min(1, total/pAct.objetivo);
  const pasado = total > pAct.objetivo;
  const esHoy = fechaSel === hoy();
  const alerta = esHoy && !pasado && new Date().getHours() >= 18 && total >= pAct.objetivo * 0.7;
  const colorAnillo = pasado ? "var(--red)" : alerta ? "var(--orange)" : "var(--green)";
  const R=58, C=2*Math.PI*R;

  app.innerHTML = `
  <div class="topbar">
    <div><h1>${mio ? "Hola, "+esc(perfil.nombre)+" 🥕" : esc(pAct.nombre)}</h1></div>
    <button class="gear" id="btn-ajustes">⚙️</button>
  </div>

  ${parejaPerfil ? `
  <div class="seg" style="margin-bottom:10px">
    <button id="ver-yo" class="${mio?"on":""}">Yo</button>
    <button id="ver-pareja" class="${!mio?"on":""}">💛 ${esc(parejaPerfil.nombre)}</button>
  </div>` : ""}

  <div class="fnav">
    <button id="f-prev">‹</button>
    <span class="f">${esHoy ? "Hoy · " : ""}${fechaLarga(fechaSel)}</span>
    <button id="f-next" ${esHoy?"disabled":""}>›</button>
  </div>

  <div class="card">
    <div class="ringbox">
      <div class="ring">
        <svg width="140" height="140">
          <circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--line)" stroke-width="12"/>
          <circle cx="70" cy="70" r="${R}" fill="none" stroke="${colorAnillo}" stroke-width="12"
            stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct)}" style="transition:stroke-dashoffset .5s"/>
        </svg>
        <div class="mid"><b>${total}</b><span class="muted">de ${pAct.objetivo}</span></div>
      </div>
      <div>
        <p style="font-weight:800;font-size:16px;color:${pasado?"var(--red)":alerta?"var(--orange)":"var(--ink)"}">
          ${pasado ? "Pasado en "+Math.abs(rest)+" kcal" : rest+" kcal libres"}</p>
        <div style="margin-top:8px">
          <span class="chip ${tp>=protT?"prot-ok":""}"><b>${tp}/${protT}g</b>proteína</span>
          <span class="chip"><b>${tc}g</b>carbos</span>
          <span class="chip"><b>${tg}g</b>grasa</span>
        </div>
        ${alerta && mio ? '<p style="margin-top:6px;font-size:13px;font-weight:700;color:var(--orange)">⚠️ Quedan '+rest+' kcal y aún falta la cena — hoy toca ligera</p>' : ""}
        ${tp<protT && mio && !alerta ? '<p class="muted" style="margin-top:6px">Te faltan '+(protT-tp)+' g de proteína — pollo, atún, huevos, yogur…</p>' : ""}
      </div>
    </div>
    ${semana ? '<p class="muted" style="margin-top:12px;border-top:1px solid var(--line);padding-top:9px">📊 Últimos 7 días: '+semana.dias+' registrados · media <b>'+semana.media+'</b> kcal/día · <b style="color:'+(semana.total<=pAct.objetivo*semana.dias?'var(--green)':'var(--red)')+'">'+(semana.total-pAct.objetivo*semana.dias>0?'+':'')+(semana.total-pAct.objetivo*semana.dias)+' kcal vs objetivo</b></p>' : ""}
  </div>

  ${mio && compartidasPend.length ? compartidasPend.map(c=>`
  <div class="card" style="border:2px solid #eab308;background:#fefce8">
    <h2>💛 ${esc(c.de_nombre||"Tu pareja")} compartió una comida</h2>
    <div class="entry" style="border-bottom:0">
      ${c.foto_url?'<img src="'+esc(c.foto_url)+'" style="width:52px;height:52px;object-fit:cover;border-radius:10px;margin-right:10px;flex-shrink:0">':""}
      <div style="flex:1">
        <p style="font-weight:700;font-size:14px">${(c.alimentos||[]).map(a=>esc(a.nombre)).join(", ")}</p>
        <p class="muted">${c.kcal} kcal · ${Math.round(c.proteina||0)}g proteína · día ${c.fecha}</p>
      </div>
    </div>
    <div class="row" style="margin-top:10px">
      <button class="btn green sm ac-si" data-id="${c.id}">✓ Yo también la comí</button>
      <button class="btn sec sm ac-no" data-id="${c.id}">No, gracias</button>
    </div>
  </div>`).join("") : ""}

  ${mio ? `
  <div class="card">
    <button class="btn" id="btn-foto" ${cargando?"disabled":""}>${cargando?'<span class="spin"></span>Analizando…':"📸 Foto a la comida"}</button>
    <div style="height:8px"></div>
    <button class="btn sec sm" id="btn-txt">✏️ Escribir lo que comí</button>
    ${esHoy && !pasado ? '<div style="height:8px"></div><button class="btn sm" id="btn-ceno" style="background:var(--green)" '+(cargando?"disabled":"")+'>🍽️ ¿Qué ceno? ('+rest+' kcal libres)</button>' : ""}
    <div id="txtbox" class="hide" style="margin-top:10px">
      <div class="row">
        <input type="text" id="txt-comida" placeholder="ej: bocadillo de tortilla y una caña">
        <button class="btn sm" style="flex:0 0 54px" id="btn-txt-go">→</button>
      </div>
    </div>
    ${!esHoy ? '<p class="muted" style="margin-top:8px">📅 Ojo: estás añadiendo al '+fechaLarga(fechaSel)+'</p>' : ""}
    <div>${errorMsg?'<div class="err">⚠ '+esc(errorMsg)+'</div>':""}</div>
  </div>` : ""}

  ${mio && sugerencias ? `
  <div class="card" style="border:2px solid var(--green);background:var(--green-soft)">
    <h2>🍽️ Te caben estas:</h2>
    ${sugerencias.map(o=>`
    <div style="padding:9px 0;border-bottom:1px dashed var(--line)">
      <p style="font-weight:800;font-size:15px">${esc(o.nombre)} ${o.de_despensa?'<span style="background:var(--green);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:8px;vertical-align:2px">🧊 CON LO DE CASA</span>':""}</p>
      <p class="muted" style="margin:2px 0 3px">${esc(o.desc)}</p>
      <p style="font-size:13px;font-weight:700">~${o.kcal} kcal · ${Math.round(o.proteina_g||0)}g prot · ⏱️ ${o.tiempo_min} min</p>
      ${!o.de_despensa && (o.faltan||[]).length ? '<p style="font-size:12px;margin-top:3px;color:var(--orange);font-weight:700">🛒 Faltaría: '+o.faltan.map(f=>esc(f)).join(", ")+' <button class="sug-falta" data-f="'+esc(JSON.stringify(o.faltan))+'" style="border:1.5px solid var(--orange);background:#fff;color:var(--orange);border-radius:8px;padding:2px 8px;font-size:11px;font-weight:800;cursor:pointer;margin-left:4px">➕ a la lista</button></p>' : ""}
    </div>`).join("")}
    <div class="row" style="margin-top:12px">
      <button class="btn sm" id="btn-ceno-mas" ${cargando?"disabled":""}>${cargando?'<span class="spin"></span>Pensando…':"🔁 No me molan, otras 3"}</button>
      <button class="btn sec sm" id="btn-ceno-x">Cerrar</button>
    </div>
  </div>` : ""}

  ${pendiente && mio ? `
  <div class="card" style="border:2px solid var(--carrot);background:var(--carrot-soft)">
    <h2>He detectado esto:</h2>
    ${fotoPend?'<img src="data:image/jpeg;base64,'+fotoPend+'" style="width:100%;border-radius:12px;margin:8px 0">':""}
    ${pendiente.alimentos.map(a=>`<div class="entry"><span>${esc(a.nombre)}</span><b>${a.kcal} kcal</b></div>`).join("")}
    <div class="entry" style="font-weight:800"><span>TOTAL</span><span>${pendiente.total_kcal} kcal</span></div>
    ${pendiente.comentario?'<p class="muted" style="font-style:italic;margin-top:6px">"'+esc(pendiente.comentario)+'"</p>':""}
    <div class="row" style="margin-top:10px">
      <input type="text" id="corr-txt" placeholder="¿Me equivoqué? Corrígeme: 'no hay queso, es pavo'">
      <button class="btn sm" style="flex:0 0 54px" id="btn-corr" ${cargando?"disabled":""}>${cargando?'<span class="spin"></span>':"🔁"}</button>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green sm" id="btn-add">✓ Añadir</button>
      ${parejaPerfil?'<button class="btn sm" id="btn-add2" style="background:#eab308">💛 Añadir y compartir</button>':""}
    </div>
    <div style="margin-top:8px"><button class="btn sec sm" id="btn-no">Descartar</button></div>
  </div>` : ""}

  <div class="card">
    <h2>${mio ? "Diario" : "Su diario"} ${esHoy ? "de hoy" : "del día"}</h2>
    ${entradas.length===0 ? '<p class="muted" style="margin-top:8px">'+(mio?"Nada registrado este día.":"No registró nada este día.")+'</p>'
      : entradas.map(e=>{
        const ab = entAbierta===e.id;
        const rx = reacciones[e.id]||{};
        return `
      <div class="entcaja" data-ent="${e.id}" style="border-bottom:1px solid var(--line);cursor:pointer;${e.borrada?"opacity:.45;":""}">
        <div class="entry" style="border-bottom:0">
          ${e.foto_url?'<img src="'+esc(e.foto_url)+'" style="width:52px;height:52px;object-fit:cover;border-radius:10px;margin-right:10px;flex-shrink:0">':""}
          <div style="flex:1;padding-right:10px">
            <p class="muted">${esc(e.hora)}${e.borrada?' · 🗑 eliminada':''}${rx.otra ? ' · '+(rx.otra==="up"?"👍":"👎")+' de '+esc(parejaPerfil?parejaPerfil.nombre:"tu pareja") : ""}</p>
            <p style="font-weight:700;font-size:14px;${e.borrada?"text-decoration:line-through;":""}">${(e.alimentos||[]).map(a=>esc(a.nombre)).join(", ")}</p>
          </div>
          <div style="text-align:right">
            <p style="font-weight:800">${e.kcal}</p>
            ${!e.borrada
              ? '<div style="white-space:nowrap"><button class="rc" data-t="up" data-id="'+e.id+'" style="background:none;border:0;font-size:19px;cursor:pointer;padding:2px 4px;opacity:'+(rx.mia==="up"?"1":".3")+'">👍</button><button class="rc" data-t="down" data-id="'+e.id+'" style="background:none;border:0;font-size:19px;cursor:pointer;padding:2px 4px;opacity:'+(rx.mia==="down"?"1":".3")+'">👎</button></div><p class="muted" style="font-size:10px">'+(ab?"▲":"▼")+'</p>'
              : '<p class="muted" style="font-size:11px">'+(ab?"▲":"▼ detalle")+'</p>'}
          </div>
        </div>
        ${ab?`
        <div style="padding:0 2px 14px">
          ${e.foto_url?'<a href="'+esc(e.foto_url)+'" target="_blank"><img src="'+esc(e.foto_url)+'" style="width:100%;border-radius:12px;margin-bottom:8px"></a>':""}
          ${(e.alimentos||[]).map(a=>`
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:5px 0;border-bottom:1px dashed var(--line)">
            <span style="font-weight:600">${esc(a.nombre)}</span>
            <span class="muted" style="white-space:nowrap">${a.kcal||0} kcal · P${Math.round(a.proteina_g||0)} C${Math.round(a.carbs_g||0)} G${Math.round(a.grasa_g||0)}</span>
          </div>`).join("")}
          <div style="margin-top:8px">
            <span class="chip"><b>${Math.round(e.proteina||0)}g</b>proteína</span>
            <span class="chip"><b>${Math.round(e.carbs||0)}g</b>carbos</span>
            <span class="chip"><b>${Math.round(e.grasa||0)}g</b>grasa</span>
          </div>
          ${mio ? (e.borrada
            ? '<button class="resto" data-id="'+e.id+'" style="margin-top:10px;background:none;border:0;color:var(--green);font-size:12px;font-weight:700;cursor:pointer">↩️ restaurar (vuelve a contar)</button>'
            : '<button class="del" data-id="'+e.id+'" style="margin-top:10px">🗑 borrar (quedará la huella en gris)</button>') : ""}
        </div>`:""}
      </div>`;}).join("")}
  </div>`;

  document.getElementById("btn-ajustes").onclick = renderAjustes;
  document.getElementById("f-prev").onclick = async ()=>{ fechaSel = addDias(fechaSel,-1); await cargarDia(); render(); };
  const fn = document.getElementById("f-next");
  if(fn) fn.onclick = async ()=>{ fechaSel = addDias(fechaSel,1); await cargarDia(); render(); };
  const vy = document.getElementById("ver-yo"), vp = document.getElementById("ver-pareja");
  if(vy) vy.onclick = async ()=>{ verUser = uid; entAbierta=null; await cargarDia(); render(); };
  if(vp) vp.onclick = async ()=>{ verUser = parejaPerfil.user_id; entAbierta=null; await cargarDia(); render(); };

  document.querySelectorAll(".entcaja").forEach(el=>el.onclick=(ev)=>{
    if(ev.target.closest(".del") || ev.target.closest(".resto") || ev.target.closest(".rc") || ev.target.closest("a")) return;
    const id = parseInt(el.dataset.ent);
    entAbierta = entAbierta===id ? null : id;
    render();
  });

  document.querySelectorAll(".rc").forEach(b=>b.onclick=async ()=>{
    const id = parseInt(b.dataset.id), tipo = b.dataset.t;
    const cur = (reacciones[id]||{}).mia;
    if(cur===tipo) await sb.from("pastanaga_reacciones").delete().eq("comida_id",id).eq("de_user",uid);
    else await sb.from("pastanaga_reacciones").upsert({comida_id:id, de_user:uid, tipo});
    await cargarDia(); render();
  });

  if(!mio) return;
  document.getElementById("btn-foto").onclick = ()=>pedirImagen(async b64=>{
    fotoPend = b64;
    await analizar([{inline_data:{mime_type:"image/jpeg",data:b64}},{text:P_COMIDA}], "comida");
  });
  document.getElementById("btn-txt").onclick = ()=>document.getElementById("txtbox").classList.toggle("hide");
  const pedirCenas = async ()=>{
    errorMsg=""; cargando=true; render();
    try{
      const r = await pedirSugerencias(Math.max(rest,150), Math.max(protT-tp,0));
      sugerencias = (r.opciones||[]).slice(0,3);
      sugPrevias.push(...sugerencias.map(o=>o.nombre));
      if(sugPrevias.length>30) sugPrevias = sugPrevias.slice(-30);
    }catch(e){ errorMsg = e.message || "No pude pensar cenas, prueba otra vez"; }
    cargando=false; render();
  };
  const bc = document.getElementById("btn-ceno");
  if(bc) bc.onclick = pedirCenas;
  const bcm = document.getElementById("btn-ceno-mas");
  if(bcm) bcm.onclick = pedirCenas;
  const bcx = document.getElementById("btn-ceno-x");
  if(bcx) bcx.onclick = ()=>{ sugerencias=null; render(); };
  document.querySelectorAll(".sug-falta").forEach(b=>b.onclick=async ()=>{
    try{
      const items = JSON.parse(b.dataset.f);
      const {data:l} = await sb.from("pastanaga_lista").select("nombre");
      const ya = (l||[]).map(x=>x.nombre.toLowerCase());
      const nuevos = items.filter(n=>!ya.includes(String(n).toLowerCase()));
      if(nuevos.length) await sb.from("pastanaga_lista").insert(nuevos.map(n=>({nombre:n})));
      b.textContent = "✓ en la lista"; b.disabled = true; b.style.opacity = ".5";
    }catch(e){ errorMsg = "No se pudo añadir a la lista"; render(); }
  });
  document.getElementById("btn-txt-go").onclick = async ()=>{
    const t = document.getElementById("txt-comida").value.trim(); if(!t) return;
    fotoPend = null;
    await analizar([{text:'Comida descrita por el usuario: "'+t+'"\n\n'+P_COMIDA}], "comida");
  };
  if(pendiente){
    const confirmarComida = async (compartir)=>{
      let foto_url = null;
      if(fotoPend){
        try{
          const blob = await (await fetch("data:image/jpeg;base64,"+fotoPend)).blob();
          const path = uid+"/"+Date.now()+".jpg";
          const {error:eUp} = await sb.storage.from("comidas").upload(path, blob, {contentType:"image/jpeg"});
          if(!eUp) foto_url = sb.storage.from("comidas").getPublicUrl(path).data.publicUrl;
        }catch(x){  }
      }
      const base = {
        fecha: fechaSel,
        alimentos: pendiente.alimentos,
        kcal: pendiente.total_kcal,
        proteina: pendiente.alimentos.reduce((s,a)=>s+(a.proteina_g||0),0),
        carbs: pendiente.alimentos.reduce((s,a)=>s+(a.carbs_g||0),0),
        grasa: pendiente.alimentos.reduce((s,a)=>s+(a.grasa_g||0),0),
        foto_url,
      };
      const {data, error} = await sb.from("pastanaga_comidas").insert({
        user_id: uid,
        hora: fechaSel===hoy() ? new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) : "—",
        ...base,
      }).select().single();
      if(error){ errorMsg = "No se guardó: "+error.message; render(); return; }
      entradas.push(data);
      if(compartir && parejaPerfil){
        const {error:e2} = await sb.from("pastanaga_compartidas").insert({
          de_user: uid, para_user: parejaPerfil.user_id, de_nombre: perfil.nombre, ...base,
        });
        if(e2) errorMsg = "Tu comida se guardó, pero no se pudo compartir: "+e2.message;
      }
      pendiente=null; fotoPend=null; puntosCache=null; render();
    };
    document.getElementById("btn-add").onclick = ()=>confirmarComida(false);
    const ba2 = document.getElementById("btn-add2");
    if(ba2) ba2.onclick = ()=>confirmarComida(true);
    document.getElementById("btn-no").onclick = ()=>{pendiente=null; fotoPend=null; render();};
    const bcor = document.getElementById("btn-corr");
    if(bcor){
      const recalcular = async ()=>{
        const t = document.getElementById("corr-txt").value.trim(); if(!t) return;
        errorMsg=""; cargando=true; render();
        try{
          const contexto = 'Tu análisis anterior fue: '+JSON.stringify({alimentos:pendiente.alimentos,total_kcal:pendiente.total_kcal})+'. El usuario te corrige: "'+t+'". Rehaz el análisis aplicando su corrección al pie de la letra: quita lo que diga que no hay, cambia lo que diga que es otra cosa, ajusta cantidades si las menciona. No inventes nada nuevo.\n\n';
          const parts = fotoPend
            ? [{inline_data:{mime_type:"image/jpeg",data:fotoPend}},{text:contexto+P_COMIDA}]
            : [{text:contexto+P_COMIDA}];
          const r = await gemini(parts);
          if(r.alimentos?.length) pendiente = r;
          else errorMsg = "No entendí la corrección, prueba a escribirla de otra forma";
        }catch(e){ errorMsg = e.message || "Error recalculando"; }
        cargando=false; render();
      };
      bcor.onclick = recalcular;
      document.getElementById("corr-txt").onkeydown = e=>{ if(e.key==="Enter") recalcular(); };
    }
  }
  document.querySelectorAll(".ac-si").forEach(b=>b.onclick=async ()=>{
    const c = compartidasPend.find(x=>x.id===parseInt(b.dataset.id)); if(!c) return;
    const {data, error} = await sb.from("pastanaga_comidas").insert({
      user_id: uid, fecha: c.fecha, hora: "💛",
      alimentos: c.alimentos, kcal: c.kcal, proteina: c.proteina,
      carbs: c.carbs, grasa: c.grasa, foto_url: c.foto_url,
    }).select().single();
    if(error){ errorMsg = "No se pudo aceptar: "+error.message; render(); return; }
    await sb.from("pastanaga_compartidas").delete().eq("id", c.id);
    compartidasPend = compartidasPend.filter(x=>x.id!==c.id);
    if(c.fecha===fechaSel) entradas.push(data);
    puntosCache=null; render();
  });
  document.querySelectorAll(".ac-no").forEach(b=>b.onclick=async ()=>{
    const id = parseInt(b.dataset.id);
    await sb.from("pastanaga_compartidas").delete().eq("id",id);
    compartidasPend = compartidasPend.filter(x=>x.id!==id);
    render();
  });
  document.querySelectorAll(".del").forEach(b=>b.onclick=async ()=>{
    const id = parseInt(b.dataset.id);
    const ent = entradas.find(x=>x.id===id);
    const {error} = await sb.from("pastanaga_comidas").update({borrada:true}).eq("id",id);
    if(!error){ if(ent) ent.borrada = true; entAbierta=null; puntosCache=null; await cargarSemana(); }
    else errorMsg = "No se pudo borrar: "+error.message;
    render();
  });
  document.querySelectorAll(".resto").forEach(b=>b.onclick=async ()=>{
    const id = parseInt(b.dataset.id);
    const ent = entradas.find(x=>x.id===id);
    const {error} = await sb.from("pastanaga_comidas").update({borrada:false}).eq("id",id);
    if(!error){ if(ent) ent.borrada = false; puntosCache=null; await cargarSemana(); }
    else errorMsg = "No se pudo restaurar: "+error.message;
    render();
  });
}

async function analizar(parts, tipo){
  errorMsg=""; cargando=true; render();
  try{
    if(parts[0]?.inline_data && !parts[0].inline_data.data) throw new Error("No se pudo leer la imagen");
    const r = await gemini(parts);
    if(tipo==="comida"){
      if(!r.alimentos?.length) errorMsg = r.comentario || "No he reconocido comida";
      else pendiente = r;
    }else{
      if(r.puntuacion<0 || !r.nombre) errorMsg = "No he reconocido el producto. Enfoca el envase o la etiqueta.";
      else producto = r;
    }
  }catch(e){ errorMsg = e.message || "Error analizando. Prueba otra vez."; }
  cargando=false; render();
}

function renderCompra(){
  const NIV = {excelente:["var(--green)","Excelente"],bueno:["var(--lime)","Bueno"],mediocre:["var(--orange)","Mediocre"],malo:["var(--red)","Malo"]};
  const nv = producto ? (NIV[producto.nivel]||NIV.mediocre) : null;
  const fijos = lista.filter(x=>x.fijo);
  const sueltos = lista.filter(x=>!x.fijo);
  const filaItem = x => `
    <div class="entry" style="align-items:center;padding:9px 0">
      <button class="li-chk" data-id="${x.id}" style="width:30px;height:30px;flex-shrink:0;margin-right:10px;border-radius:9px;border:2px solid ${x.comprado?"#c8e6cf":"var(--line)"};background:${x.comprado?"var(--green-soft)":"#fff"};color:var(--green);font-weight:800;cursor:pointer">${x.comprado?"✓":""}</button>
      <p style="flex:1;font-size:15px;${x.fijo?"font-weight:800;":""}${x.comprado?"color:#c7c2bb;text-decoration:line-through;":""}">${esc(x.nombre)}</p>
      <button class="li-fijo" data-id="${x.id}" style="background:none;border:0;font-size:18px;cursor:pointer;padding:4px;opacity:${x.fijo?1:.35}">⭐</button>
      ${x.fijo?"":'<button class="li-del" data-id="'+x.id+'" style="background:none;border:0;font-size:15px;cursor:pointer;padding:4px">🗑</button>'}
    </div>`;

  app.innerHTML = `
  <div class="topbar"><h1>Compra 🛒</h1><button class="gear" id="btn-ajustes">⚙️</button></div>
  <div class="seg" style="margin-bottom:12px">
    <button data-s="lista" class="${subCompra==="lista"?"on":""}">📝 Lista</button>
    <button data-s="despensa" class="${subCompra==="despensa"?"on":""}">🧊 Despensa</button>
    <button data-s="escaner" class="${subCompra==="escaner"?"on":""}">🔍 Escáner</button>
  </div>
  ${errorMsg?'<div class="err" style="margin-bottom:10px">⚠ '+esc(errorMsg)+'</div>':""}

  ${subCompra==="lista" ? `
  <div class="card">
    <div class="row">
      <input type="text" id="li-nuevo" placeholder="Añadir a la lista…">
      <button class="btn sm" style="flex:0 0 54px" id="li-add">+</button>
    </div>
    <div class="row" style="margin-top:8px">
      <button class="btn sec sm" id="li-sugerir" ${cargando?"disabled":""}>${cargando?'<span class="spin" style="border-color:rgba(0,0,0,.15);border-top-color:var(--ink)"></span>Pensando…':"🧠 Sugerir básicos"}</button>
      <button class="btn sec sm" id="li-reset">🔄 Nueva compra</button>
    </div>
    <p class="muted" style="margin-top:8px">⭐ = básico: nunca se borra, al comprarlo se pone en gris. "Nueva compra" reactiva todos los básicos y limpia lo suelto ya comprado.</p>
  </div>
  ${fijos.length ? '<div class="card"><h2>Básicos ⭐</h2>'+fijos.map(filaItem).join("")+'</div>' : ""}
  ${sueltos.length ? '<div class="card"><h2>Lo demás</h2>'+sueltos.map(filaItem).join("")+'</div>' : ""}
  ${!lista.length ? '<div class="card"><p class="muted">Lista vacía. Añade cosas a mano o dale a 🧠 Sugerir básicos y te propongo la compra base para tu proteína.</p></div>' : ""}
  ` : ""}

  ${subCompra==="despensa" ? `
  <div class="card">
    <button class="btn" id="btn-ticket" ${cargando?"disabled":""}>${cargando?'<span class="spin"></span>Leyendo ticket…':"🧾 Foto al ticket"}</button>
    <p class="muted" style="margin-top:8px">Foto al ticket del súper y meto lo comprado en la despensa yo solo. También puedes añadir a mano:</p>
    <div class="row" style="margin-top:8px">
      <input type="text" id="de-nuevo" placeholder="Añadir a la despensa…">
      <button class="btn sm" style="flex:0 0 54px" id="de-add">+</button>
    </div>
  </div>
  ${ticketPend ? `
  <div class="card" style="border:2px solid var(--carrot);background:var(--carrot-soft)">
    <h2>🧾 He leído esto:</h2>
    ${ticketPend.map(n=>'<div class="entry"><span>'+esc(n)+'</span></div>').join("")}
    <div class="row" style="margin-top:12px">
      <button class="btn green sm" id="tk-si">✓ Meter en despensa</button>
      <button class="btn sec sm" id="tk-no">Descartar</button>
    </div>
  </div>` : ""}
  <div class="card">
    <h2>En casa hay</h2>
    ${despensa.length ? despensa.map(d=>`
    <div class="entry" style="align-items:center">
      <p style="flex:1;font-size:15px;font-weight:600">${esc(d.nombre)}</p>
      <button class="de-fin" data-id="${d.id}" data-n="${esc(d.nombre)}" style="border:2px solid var(--line);background:#fff;border-radius:10px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer">se acabó → 📝</button>
    </div>`).join("") : '<p class="muted" style="margin-top:8px">Despensa vacía. Foto al primer ticket y se llena sola.</p>'}
  </div>
  ` : ""}

  ${subCompra==="escaner" ? `
  <div class="card">
    <p class="muted" style="margin-bottom:12px">Hazle foto a un producto del súper — mejor a la etiqueta de ingredientes o la tabla nutricional — y te digo si merece la pena o es un ultraprocesado disfrazado.</p>
    <button class="btn" id="btn-prod" ${cargando?"disabled":""}>${cargando?'<span class="spin"></span>Analizando…':"🔍 Escanear producto"}</button>
  </div>
  ${producto&&nv ? `
  <div class="card" style="padding:0;overflow:hidden">
    <div class="score" style="background:${nv[0]}">
      <div><p style="font-weight:800;font-size:18px">${esc(producto.nombre)}</p><p style="opacity:.9;font-size:13px;text-transform:uppercase;font-weight:700">${nv[1]}</p></div>
      <div class="n">${producto.puntuacion}<span style="font-size:16px;opacity:.75">/100</span></div>
    </div>
    <div style="padding:16px">
      ${producto.kcal_100g>0?'<p class="muted" style="margin-bottom:8px">~'+producto.kcal_100g+' kcal / 100g</p>':""}
      ${(producto.positivos||[]).map(p=>'<p class="pt"><b style="color:var(--green)">✓</b> '+esc(p)+'</p>').join("")}
      ${(producto.negativos||[]).map(p=>'<p class="pt"><b style="color:var(--red)">✗</b> '+esc(p)+'</p>').join("")}
      ${producto.alternativa?'<div class="alt"><b>💡 Alternativa mejor</b><br>'+esc(producto.alternativa)+'</div>':""}
      <div style="margin-top:14px"><button class="btn sec sm" id="btn-otro">Escanear otro</button></div>
    </div>
  </div>`:""}
  ` : ""}`;

  document.getElementById("btn-ajustes").onclick = renderAjustes;
  document.querySelectorAll(".seg button[data-s]").forEach(b=>b.onclick=()=>{subCompra=b.dataset.s; errorMsg=""; render();});

  const liAdd = document.getElementById("li-add");
  if(liAdd){
    const anadir = async ()=>{
      const inp = document.getElementById("li-nuevo");
      const n = inp.value.trim(); if(!n) return;
      const {error} = await sb.from("pastanaga_lista").insert({nombre:n});
      if(error){ errorMsg = error.message; } else await cargarCompra();
      render();
    };
    liAdd.onclick = anadir;
    document.getElementById("li-nuevo").onkeydown = e=>{ if(e.key==="Enter") anadir(); };
    document.getElementById("li-sugerir").onclick = async ()=>{
      errorMsg=""; cargando=true; render();
      try{
        const r = await gemini([{text:'Lista base de la compra para alguien que quiere perder grasa y llegar a '+protObjetivo(perfil)+' g de proteína al día, comprando en un supermercado español (tipo Mercadona). Entre 10 y 14 artículos, nombres cortos, prioriza fuentes de proteína baratas y cosas fáciles de cocinar. Responde SOLO JSON válido sin markdown: {"articulos":["Pechuga de pollo","Huevos",...]}'}]);
        const existentes = lista.map(x=>x.nombre.toLowerCase());
        const nuevos = (r.articulos||[]).filter(n=>!existentes.includes(String(n).toLowerCase()));
        if(nuevos.length) await sb.from("pastanaga_lista").insert(nuevos.map(n=>({nombre:n, fijo:true})));
        await cargarCompra();
      }catch(e){ errorMsg = e.message || "No pude sugerir, prueba otra vez"; }
      cargando=false; render();
    };
    document.getElementById("li-reset").onclick = async ()=>{
      if(!confirm("¿Preparar la próxima compra? Reactiva todos los básicos ⭐ y borra lo suelto ya comprado.")) return;
      await sb.from("pastanaga_lista").update({comprado:false}).eq("fijo",true);
      await sb.from("pastanaga_lista").delete().eq("fijo",false).eq("comprado",true);
      await cargarCompra(); render();
    };
  }
  document.querySelectorAll(".li-chk").forEach(b=>b.onclick=async ()=>{
    const x = lista.find(i=>i.id===parseInt(b.dataset.id)); if(!x) return;
    await sb.from("pastanaga_lista").update({comprado:!x.comprado}).eq("id",x.id);
    x.comprado = !x.comprado; render();
  });
  document.querySelectorAll(".li-fijo").forEach(b=>b.onclick=async ()=>{
    const x = lista.find(i=>i.id===parseInt(b.dataset.id)); if(!x) return;
    await sb.from("pastanaga_lista").update({fijo:!x.fijo}).eq("id",x.id);
    x.fijo = !x.fijo; render();
  });
  document.querySelectorAll(".li-del").forEach(b=>b.onclick=async ()=>{
    await sb.from("pastanaga_lista").delete().eq("id",parseInt(b.dataset.id));
    lista = lista.filter(i=>i.id!==parseInt(b.dataset.id)); render();
  });

  const deAdd = document.getElementById("de-add");
  if(deAdd){
    const anadirD = async ()=>{
      const inp = document.getElementById("de-nuevo");
      const n = inp.value.trim(); if(!n) return;
      const {error} = await sb.from("pastanaga_despensa").insert({nombre:n});
      if(error){ errorMsg = error.message; } else await cargarCompra();
      render();
    };
    deAdd.onclick = anadirD;
    document.getElementById("de-nuevo").onkeydown = e=>{ if(e.key==="Enter") anadirD(); };
    document.getElementById("btn-ticket").onclick = ()=>pedirImagen(async b64=>{
      errorMsg=""; cargando=true; render();
      try{
        const r = await gemini([{inline_data:{mime_type:"image/jpeg",data:b64}},{text:P_TICKET}]);
        if(!r.articulos?.length) errorMsg = "No he podido leer artículos en esa foto. Enfoca el ticket entero.";
        else ticketPend = r.articulos;
      }catch(x){ errorMsg = x.message || "Error leyendo el ticket"; }
      cargando=false; render();
    });
  }
  const tkSi = document.getElementById("tk-si");
  if(tkSi) tkSi.onclick = async ()=>{
    await sb.from("pastanaga_despensa").insert(ticketPend.map(n=>({nombre:n})));
    const comprados = lista.filter(x=>!x.comprado && ticketPend.some(n=>{
      const a = String(n).toLowerCase(), b = x.nombre.toLowerCase();
      return a.includes(b) || b.includes(a);
    }));
    for(const x of comprados) await sb.from("pastanaga_lista").update({comprado:true}).eq("id",x.id);
    ticketPend = null; await cargarCompra(); render();
  };
  const tkNo = document.getElementById("tk-no");
  if(tkNo) tkNo.onclick = ()=>{ ticketPend=null; render(); };
  document.querySelectorAll(".de-fin").forEach(b=>b.onclick=async ()=>{
    const id = parseInt(b.dataset.id), nombre = b.dataset.n;
    const ya = lista.find(x=>x.nombre.toLowerCase()===nombre.toLowerCase());
    if(ya) await sb.from("pastanaga_lista").update({comprado:false}).eq("id",ya.id);
    else await sb.from("pastanaga_lista").insert({nombre});
    await sb.from("pastanaga_despensa").delete().eq("id",id);
    await cargarCompra(); render();
  });

  const bprod = document.getElementById("btn-prod");
  if(bprod){
    bprod.onclick = ()=>pedirImagen(async b64=>{
      producto = null;
      await analizar([{inline_data:{mime_type:"image/jpeg",data:b64}},{text:P_PRODUCTO}], "producto");
    });
  }
  const bo = document.getElementById("btn-otro");
  if(bo) bo.onclick = ()=>{producto=null; render();};
}

function renderGym(){
  const mio = gymUser===uid;
  const esHoyG = fechaGym===hoy();
  const rut = rutinaDe(perfil);

  if(modoEditar && mio){
    const ids = (rut[diaGym]||[]).filter(id=>BIB[id]);
    app.innerHTML = `
    <div class="topbar"><h1>Mi rutina ✏️</h1><button class="gear" id="btn-ajustes">⚙️</button></div>
    <div class="seg" style="margin-bottom:10px">
      ${["A","B","C","D"].map(d=>`<button data-d="${d}" class="${diaGym===d?"on":""}" style="font-size:12px">${esc(nombreRutina(perfil,d))}</button>`).join("")}
    </div>
    <div class="row" style="margin-bottom:10px">
      <input type="text" id="ed-nombre" value="${esc(nombreRutina(perfil,diaGym))}" maxlength="24">
      <button class="btn sm" style="flex:0 0 100px" id="ed-ren">Renombrar</button>
    </div>
    <p class="muted" style="margin-bottom:12px">${NOTAS_DIA[diaGym]}</p>
    ${ids.map(id=>`
    <div class="ej"><div class="body" style="cursor:pointer" data-ficha="${id}">
      <p class="nm">${BIB[id].n} <span class="muted" style="font-weight:600">· ${BIB[id].m}</span></p>
      <p class="muted">${BIB[id].s}</p></div>
      <button class="ed-del" data-id="${id}" style="width:48px;border:0;border-left:2px solid var(--line);background:none;font-size:17px;cursor:pointer">✕</button>
    </div>`).join("")}
    <button class="btn sec sm" id="ed-add" style="margin-top:4px">➕ Añadir ejercicio</button>
    <div style="margin-top:12px"><button class="btn green" id="ed-fin">✓ Listo</button></div>
    <p class="muted" style="margin-top:8px">Los cambios valen para las próximas sesiones; lo ya registrado no se toca.</p>

    ${bibAbierta ? `
    <div class="overlay" id="bib-ov"><div class="sheet">
      <h2 style="margin-bottom:8px">Biblioteca 📚</h2>
      ${GRUPOS.map(g=>{
        const ejs = Object.entries(BIB).filter(([id,e])=>e.m===g && !ids.includes(id));
        if(!ejs.length) return "";
        return '<p style="font-weight:800;margin:12px 0 4px">'+g+'</p>'+ejs.map(([id,e])=>
        '<div class="entry" style="align-items:center"><div style="flex:1"><p style="font-weight:700;font-size:14px">'+e.n+'</p><p class="muted">'+e.s+'</p></div><button class="bib-add" data-id="'+id+'" style="border:2px solid var(--green);background:var(--green-soft);color:var(--green);border-radius:10px;width:36px;height:36px;font-size:19px;font-weight:800;cursor:pointer">+</button></div>').join("");
      }).join("")}
      <div style="margin-top:14px"><button class="btn sec sm" id="bib-x">Cerrar</button></div>
    </div></div>` : ""}`;

    document.getElementById("btn-ajustes").onclick = renderAjustes;
    document.querySelectorAll(".seg button[data-d]").forEach(b=>b.onclick=()=>{diaGym=b.dataset.d; render();});
    document.getElementById("ed-ren").onclick = async ()=>{
      const n = document.getElementById("ed-nombre").value.trim(); if(!n) return;
      materializarRutina(); perfil.rutina.nombres[diaGym] = n;
      await guardarRutina(); render();
    };
    document.querySelectorAll(".ed-del").forEach(b=>b.onclick=async ()=>{
      materializarRutina();
      perfil.rutina[diaGym] = perfil.rutina[diaGym].filter(x=>x!==b.dataset.id);
      await guardarRutina(); render();
    });
    document.getElementById("ed-add").onclick = ()=>{bibAbierta=true; render();};
    document.getElementById("ed-fin").onclick = ()=>{modoEditar=false; bibAbierta=false; render();};
    document.querySelectorAll(".bib-add").forEach(b=>b.onclick=async ()=>{
      materializarRutina();
      perfil.rutina[diaGym].push(b.dataset.id);
      await guardarRutina(); render();
    });
    const bx = document.getElementById("bib-x");
    if(bx) bx.onclick = ()=>{bibAbierta=false; render();};
    const bov = document.getElementById("bib-ov");
    if(bov) bov.onclick = e=>{ if(e.target===bov){bibAbierta=false; render();} };
    document.querySelectorAll("[data-ficha]").forEach(el=>el.onclick=()=>renderFicha(el.dataset.ficha));
    return;
  }

  const reg = sesionG?.registro;
  const done = reg ? reg.ejercicios.filter(x=>x.hecho).length : 0;

  app.innerHTML = `
  <div class="topbar"><h1>Gym 🏋️</h1><button class="gear" id="btn-ajustes">⚙️</button></div>

  ${parejaPerfil ? `
  <div class="seg" style="margin-bottom:10px">
    <button id="g-yo" class="${mio?"on":""}">Yo</button>
    <button id="g-pareja" class="${!mio?"on":""}">💛 ${esc(parejaPerfil.nombre)}</button>
  </div>` : ""}

  <div class="fnav">
    <button id="g-prev">‹</button>
    <span class="f">${esHoyG ? "Hoy · " : ""}${fechaLarga(fechaGym)}</span>
    <button id="g-next" ${esHoyG?"disabled":""}>›</button>
  </div>
  ${errorMsg?'<div class="err" style="margin-bottom:10px">⚠ '+esc(errorMsg)+'</div>':""}

  ${!reg && mio ? `
  <div class="card">
    <h2>¿Qué rutina toca?</h2>
    <div class="seg" style="margin:10px 0">
      ${["A","B","C","D"].map(d=>`<button data-d="${d}" class="${diaGym===d?"on":""}" style="font-size:12px">${esc(nombreRutina(perfil,d))}</button>`).join("")}
    </div>
    <p class="muted" style="margin-bottom:10px">${NOTAS_DIA[diaGym]}</p>
    ${(rut[diaGym]||[]).filter(id=>BIB[id]).map(id=>'<div class="ej" style="cursor:pointer" data-ficha="'+id+'"><div class="body"><p class="nm">'+BIB[id].n+' 📖</p><p class="muted">'+BIB[id].s+' · '+BIB[id].m+'</p></div></div>').join("")}
    <div style="margin-top:12px"><button class="btn green" id="g-empezar">🏋️ Empezar: ${esc(nombreRutina(perfil,diaGym))}</button></div>
  </div>` : ""}

  ${!reg && !mio ? '<div class="card"><p class="muted">'+esc(parejaPerfil?parejaPerfil.nombre:"Tu pareja")+' no entrenó este día 😴</p></div>' : ""}

  ${reg ? `
  <div class="card" style="padding-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h2>${esc(nombreRutina(mio?perfil:parejaPerfil, sesionG.dia))} · ${done}/${reg.ejercicios.length}</h2>
      ${mio?'<button id="g-rehacer" style="background:none;border:0;font-size:12px;font-weight:700;color:var(--muted);cursor:pointer;text-decoration:underline">🔄 rehacer con mi rutina actual</button>':""}
    </div>
  </div>
  ${reg.ejercicios.map((x,i)=>{
    const e = BIB[x.id] || {n:x.id, s:"", p:1};
    return `<div class="ej ${x.hecho?"done":""}">
      ${mio?'<button class="chk" data-i="'+i+'">'+(x.hecho?"✓":"")+'</button>':'<div class="chk" style="display:flex;align-items:center;justify-content:center;'+(x.hecho?"background:var(--green);":"")+'">'+(x.hecho?"✓":"")+'</div>'}
      <div class="body" style="cursor:pointer" data-ficha="${x.id}">
        <p class="nm">${e.n} 📖</p>
        <p class="muted">${e.s}</p>
      </div>
      ${e.p ? (mio
        ? '<input class="kg" type="number" inputmode="decimal" placeholder="kg" data-i="'+i+'" value="'+esc(x.kg||"")+'">'
        : '<div style="display:flex;align-items:center;padding-right:12px;font-weight:800;font-size:14px">'+(x.kg?esc(x.kg)+" kg":"")+'</div>') : ""}
    </div>`;
  }).join("")}
  ${done===reg.ejercicios.length && reg.ejercicios.length ? '<div class="ok">💪 Sesión completada'+(mio?", máquina":"")+' (+15 pts)</div>' : ""}
  ${mio?'<p class="muted" style="margin-top:8px">Toca el nombre de un ejercicio para ver cómo se hace 📖 · los kg quedan registrados en este día</p>':""}
  ` : ""}

  ${mio?'<button class="btn sec sm" id="g-editar" style="margin-top:10px">✏️ Editar mi rutina</button>':""}`;

  document.getElementById("btn-ajustes").onclick = renderAjustes;
  document.getElementById("g-prev").onclick = async ()=>{ fechaGym = addDias(fechaGym,-1); await cargarGymDia(); render(); };
  const gn = document.getElementById("g-next");
  if(gn) gn.onclick = async ()=>{ fechaGym = addDias(fechaGym,1); await cargarGymDia(); render(); };
  const gy = document.getElementById("g-yo"), gp = document.getElementById("g-pareja");
  if(gy) gy.onclick = async ()=>{ gymUser = uid; await cargarGymDia(); render(); };
  if(gp) gp.onclick = async ()=>{ gymUser = parejaPerfil.user_id; await cargarGymDia(); render(); };
  document.querySelectorAll("[data-ficha]").forEach(el=>el.onclick=(ev)=>{ ev.stopPropagation(); renderFicha(el.dataset.ficha); });

  if(!mio) return;
  document.querySelectorAll(".seg button[data-d]").forEach(b=>b.onclick=()=>{diaGym=b.dataset.d; render();});
  const ge = document.getElementById("g-empezar");
  if(ge) ge.onclick = async ()=>{
    sesionG = {dia:diaGym, registro: crearRegistro(diaGym)};
    await guardarSesion(); puntosCache=null; render();
  };
  const gr = document.getElementById("g-rehacer");
  if(gr) gr.onclick = async ()=>{
    if(!confirm("¿Rehacer esta sesión con tu rutina actual? Se pierden los checks y kg de este día.")) return;
    sesionG = {dia:sesionG.dia, registro: crearRegistro(sesionG.dia)};
    await guardarSesion(); puntosCache=null; render();
  };
  document.querySelectorAll(".chk").forEach(b=>{ if(b.tagName==="BUTTON") b.onclick = async ()=>{
    const x = sesionG.registro.ejercicios[parseInt(b.dataset.i)];
    x.hecho = !x.hecho;
    await guardarSesion(); puntosCache=null; render();
  };});
  document.querySelectorAll(".kg").forEach(inp=>inp.onchange = async ()=>{
    const x = sesionG.registro.ejercicios[parseInt(inp.dataset.i)];
    x.kg = inp.value;
    perfil.pesos = perfil.pesos||{}; perfil.pesos[x.id] = inp.value;
    await guardarSesion(); await guardarPesos();
  });
  const ged = document.getElementById("g-editar");
  if(ged) ged.onclick = ()=>{ modoEditar=true; render(); };
}

function renderFicha(id){
  const e = BIB[id]; if(!e) return;
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `
  <div class="sheet">
    <h2>${e.n}</h2>
    <p class="muted" style="margin:2px 0 10px">${e.m} · ${e.s}</p>
    <img src="img/${id}.gif" style="width:100%;border-radius:14px;background:#f2efe9" onerror="this.outerHTML='<div style=&quot;background:#f2efe9;border-radius:14px;padding:40px;text-align:center;font-size:44px&quot;>💪<p style=&quot;font-size:13px;color:#78716c;margin-top:6px&quot;>GIF pendiente de añadir (img/${id}.gif)</p></div>'">
    <div style="margin-top:12px">
      ${e.tips.map(t=>'<p class="pt">✅ '+t+'</p>').join("")}
    </div>
    <div style="margin-top:14px"><button class="btn sec sm" id="fi-x">Cerrar</button></div>
  </div>`;
  document.body.appendChild(ov);
  ov.onclick = ev => { if(ev.target===ov) ov.remove(); };
  ov.querySelector("#fi-x").onclick = ()=>ov.remove();
}

async function calcularPuntos(){
  const [{data:ps},{data:coms},{data:gyms}] = await Promise.all([
    sb.from("pastanaga_perfiles").select("user_id,nombre,peso,objetivo"),
    sb.from("pastanaga_comidas").select("user_id,fecha,kcal,proteina,borrada"),
    sb.from("pastanaga_gym").select("user_id,fecha,dia,hechos,registro"),
  ]);
  const H = hoy();
  return (ps||[]).map(p=>{
    const porDia = {};
    (coms||[]).filter(c=>c.user_id===p.user_id && !c.borrada).forEach(c=>{
      porDia[c.fecha] = porDia[c.fecha] || {kcal:0,prot:0};
      porDia[c.fecha].kcal += c.kcal; porDia[c.fecha].prot += c.proteina||0;
    });
    let pts = 0, diasOk = 0, diasProt = 0;
    const diasReg = Object.keys(porDia).length;
    pts += diasReg * 10;
    const protT = protObjetivo(p);
    Object.entries(porDia).forEach(([f,v])=>{
      if(f < H){
        if(v.kcal > 0 && v.kcal <= p.objetivo){ pts += 25; diasOk++; }
        if(v.prot >= protT){ pts += 15; diasProt++; }
      }
    });
    let sesiones = 0;
    (gyms||[]).filter(g=>g.user_id===p.user_id).forEach(g=>{
      let completo = false;
      if(g.registro?.ejercicios?.length) completo = g.registro.ejercicios.every(x=>x.hecho);
      else {
        const n = Object.entries(g.hechos||{}).filter(([k,v])=>v && k.startsWith(g.dia+"-")).length;
        completo = n >= 5;
      }
      if(completo){ pts += 15; sesiones++; }
    });
    let racha = 0, f = porDia[H] ? H : addDias(H,-1);
    while(porDia[f]){ racha++; f = addDias(f,-1); }
    return {...p, pts, diasReg, diasOk, diasProt, sesiones, racha};
  }).sort((a,b)=>b.pts-a.pts);
}

async function renderPuntos(){
  app.innerHTML = `<div class="topbar"><h1>Puntos 🏆</h1><button class="gear" id="btn-ajustes">⚙️</button></div><p class="muted">Calculando…</p>`;
  document.getElementById("btn-ajustes").onclick = renderAjustes;
  if(!puntosCache) puntosCache = await calcularPuntos();
  if(vista!=="puntos") return;
  const lista = puntosCache;
  app.innerHTML = `
  <div class="topbar"><h1>Puntos 🏆</h1><button class="gear" id="btn-ajustes">⚙️</button></div>
  ${lista.map((p,i)=>`
    <div class="pcard ${i===0&&lista.length>1?"lider":""}">
      <div class="medal">${i===0 ? (lista.length>1?"🥇":"🏅") : "🥈"}</div>
      <div>
        <p style="font-weight:800;font-size:17px">${esc(p.nombre)}${p.user_id===uid?" (tú)":""}</p>
        <div style="margin-top:3px">
          <span class="stat">🔥 racha ${p.racha}</span>
          <span class="stat">✅ ${p.diasOk} días en objetivo</span>
          <span class="stat">🍗 ${p.diasProt} de proteína</span>
          <span class="stat">🏋️ ${p.sesiones} sesiones</span>
        </div>
      </div>
      <div class="pts">${p.pts}<small>puntos</small></div>
    </div>`).join("")}
  ${lista.length<2 ? '<p class="muted" style="margin-bottom:12px">Cuando '+(parejaPerfil?esc(parejaPerfil.nombre):"tu pareja")+' registre cosas, aparecerá aquí el duelo.</p>' : ""}
  <div class="card">
    <h2>Cómo se ganan</h2>
    <p class="pt">📔 <b>+10</b> por cada día que registras comidas</p>
    <p class="pt">🎯 <b>+25</b> por cerrar el día dentro del objetivo</p>
    <p class="pt">🍗 <b>+15</b> por llegar a tu proteína diaria</p>
    <p class="pt">🏋️ <b>+15</b> por sesión de gym completada</p>
    <p class="muted" style="margin-top:6px">Los bonus de objetivo y proteína se dan al cerrar el día (hoy aún no cuenta).</p>
  </div>
  <div class="card">
    <h2>Premios 💛</h2>
    <p class="pt"><b>100 pts</b> · el otro prepara el desayuno del finde</p>
    <p class="pt"><b>250 pts</b> · masaje de 20 minutos</p>
    <p class="pt"><b>500 pts</b> · cena donde elija el ganador</p>
    <p class="pt"><b>1000 pts</b> · día de plan sorpresa</p>
    <p class="muted" style="margin-top:6px">Negociables a propuestas mas creativas 😄</p>
  </div>`;
  document.getElementById("btn-ajustes").onclick = renderAjustes;
}

function renderAjustes(){
  const ov = document.createElement("div");
  ov.className="overlay";
  ov.innerHTML = `
  <div class="sheet">
    <h2 style="margin-bottom:6px">Ajustes ⚙️</h2>
    <div class="row">
      <div><label>Peso actual (kg)</label><input type="number" id="aj-peso" step="0.1" value="${perfil.peso}"></div>
      <div><label>Objetivo (kcal)</label><input type="number" id="aj-obj" value="${perfil.objetivo}"></div>
    </div>
    <p class="muted" style="margin-top:6px">Proteína diaria: se calcula sola (1.6 g por kg de peso). Si actualizas el peso, se actualiza también.</p>
    <div style="margin-top:10px"><button class="btn sec sm" id="aj-recalc">🔄 Recalcular objetivo con mi peso nuevo</button></div>
    <label>Clave de API de Gemini</label>
    <input type="password" id="aj-key" value="${esc(perfil.apikey||"")}">
    <div style="margin-top:16px" class="row">
      <button class="btn sm" id="aj-ok">Guardar</button>
      <button class="btn sec sm" id="aj-x">Cerrar</button>
    </div>
    <div style="margin-top:8px"><button class="btn sec sm" id="aj-salir" style="color:var(--red);border-color:var(--red)">Cerrar sesión</button></div>
  </div>`;
  document.body.appendChild(ov);
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  ov.querySelector("#aj-recalc").onclick=()=>{
    const p = parseFloat(ov.querySelector("#aj-peso").value)||perfil.peso;
    ov.querySelector("#aj-obj").value = calcularObjetivo({...perfil, peso:p});
  };
  ov.querySelector("#aj-ok").onclick=async ()=>{
    const cambios = {
      peso: parseFloat(ov.querySelector("#aj-peso").value)||perfil.peso,
      objetivo: parseInt(ov.querySelector("#aj-obj").value)||perfil.objetivo,
      apikey: ov.querySelector("#aj-key").value.trim()||perfil.apikey,
    };
    const {error} = await sb.from("pastanaga_perfiles").update(cambios).eq("user_id",uid);
    if(error){ alert("Error guardando: "+error.message); return; }
    Object.assign(perfil, cambios);
    puntosCache=null;
    ov.remove(); render();
  };
  ov.querySelector("#aj-x").onclick=()=>ov.remove();
  ov.querySelector("#aj-salir").onclick=async ()=>{
    await sb.auth.signOut();
    uid=null; perfil=null; parejaPerfil=null; entradas=[]; ov.remove(); render();
  };
}

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
(async function init(){
  if(!sb){ render(); return; }
  const {data:{session}} = await sb.auth.getSession();
  if(session){
    uid = session.user.id;
    await cargarPerfiles();
    if(perfil){ gymUser = uid; await cargarDia(); await cargarGymDia(); await cargarCompartidas(); }
  }
  render();
})();