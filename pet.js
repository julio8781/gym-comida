// ===== PASTANAGA: mascota y escenarios =====
// Todo lo visual de la zanahoria vive aquí para no engordar app.js

// --- Fondo de día por persona (luego esto lo elegirá cada uno en Ajustes) ---
// De momento se decide por nombre; el día que personalicemos, se leerá del perfil.
const FONDO_DIA = {
  "Julio": "aluminis",
  "Roney": "leroy",
};
const FONDO_DIA_DEFECTO = "aluminis";

// Devuelve qué escenario toca según la hora y de quién es la zanahoria
function fondoEscena(nombre){
  const h = new Date().getHours();
  const durmiendo = (h >= 23 || h < 7);      // 23:00–07:00 -> habitación
  if(durmiendo) return "noche";
  return FONDO_DIA[nombre] || FONDO_DIA_DEFECTO;
}

// Elige la imagen de Pastanaga según el estado del día
function imgPastanaga({gordura=0.3, animo='normal', noche=false}={}){
    let estado;
  if(gordura > 0.6)        estado = 'gorda';
  else if(animo === 'mal') estado = 'triste';
  else                     estado = 'normal';

  const claseAnim = (estado === 'gorda') ? 'pp-resp pp-lento' : 'pp-resp';
  return `<img class="pp-pastanaga ${claseAnim}"
    src="https://gym.alvarezjulio.com/img/pet/${estado}.png?v=2"
    alt="Pastanaga ${estado}" width="150">`;
}