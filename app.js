/*
  Revised app.js
  - Persist progress in cookies
  - Fetch remote lesson completion from the provided API and merge with local cookie state
  - When opening a lesson, remove the Play / Mark buttons and instead show completion status (from API + cookies)
*/

const LESSONS_API = 'https://juandevyt.github.io/api-design-curso/app.json';
let lessons = [
  {id:1, title:"Introducción al Diseño", desc:"Conceptos y herramientas", time:"18m", progress:0},
  {id:2, title:"Tipografía", desc:"Elegir y combinar tipografías", time:"34m", progress:0},
  {id:3, title:"Color y Teoría", desc:"Paletas, armonía y accesibilidad", time:"46m", progress:0},
  {id:4, title:"Composición y layout", desc:"Grid, jerarquía y balance", time:"52m", progress:0},
  {id:5, title:"Branding Básico", desc:"Logotipos y sistemas visuales", time:"38m", progress:0},
  {id:6, title:"Reto práctico", desc:"Proyecto paso a paso", time:"72m", progress:0},
];

const root = document.getElementById('app');
const lessonsList = document.getElementById('lessonsList');
const resumeBtn = document.getElementById('resumeBtn');
const catalogBtn = document.getElementById('catalogBtn');
const themeToggle = document.getElementById('themeToggle');

const homeView = document.getElementById('homeView');
const resourcesView = document.getElementById('resourcesView');
const profileView = document.getElementById('profileView');



// --- fetch remote progress and merge ---
async function fetchRemoteProgress(){
  try{
    const res = await fetch(LESSONS_API, {cache: 'no-store'});
    if(!res.ok) throw new Error('fetch error');
    const data = await res.json();
    // map remote completed flags to array of ids
    const remoteCompleted = (data.progreso_curso && data.progreso_curso.lecciones)
      ? data.progreso_curso.lecciones.filter(l=>l.completada).map(l=>l.id)
      : [];
    return remoteCompleted;
  }catch(err){
    // network error: return empty remote list
    return [];
  }
}

 // set lessons[].progress based on remote fetch
async function syncProgress(){
  const remote = await fetchRemoteProgress(); // array of completed ids from remote
  const remoteIds = (remote||[]).map(Number);
  lessons.forEach(l=>{
    l.progress = remoteIds.includes(l.id) ? 100 : 0;
  });
  renderLessons();
  updateProgressOverview();
}

// --- render / UI changes ---
function renderLessons(){
  lessonsList.innerHTML = '';
  lessons.forEach(l=>{
    const el = document.createElement('button');
    el.className = 'lesson';
    el.innerHTML = `
      <div class="thumb" aria-hidden="true">${l.id}</div>
      <div class="meta">
        <div class="name">${l.title}</div>
        <div class="desc">${l.desc}</div>
      </div>
      <div class="time">${l.time}</div>
    `;
    el.addEventListener('click', ()=> openLesson(l));
    lessonsList.appendChild(el);
  });
}

/* When opening a lesson: show fetched completion status and let user re-sync (no local marking) */
function openLesson(lesson){
  // render lesson details inline replacing the lessons list (no sheet)
  const isCompleted = (lesson.progress || 0) >= 100;
  lessonsList.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <button id="backToList" class="ghost" style="padding:8px 10px;border-radius:8px">Atrás</button>
      <div style="font-weight:700">${lesson.title}</div>
    </div>
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
      <div style="width:84px;height:56px;border-radius:8px;background:linear-gradient(90deg,#ffd89b,#19547b);display:grid;place-items:center;color:white;font-weight:700">${lesson.id}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;margin-bottom:6px">${lesson.title}</div>
        <div style="color:var(--muted);font-size:13px">${lesson.desc}</div>
      </div>
    </div>
    <div style="margin-bottom:10px">
      <div style="font-weight:700;margin-bottom:6px">Estado</div>
      <div id="lessonStatus" style="color:var(--muted)">${isCompleted ? 'Completada (sincronizada)' : 'No completada'}</div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button id="syncBtn" class="primary" style="flex:1">Sincronizar estado (fetch)</button>
    </div>
    <div style="color:var(--muted)"><strong>Contenido:</strong>
      <ul style="padding-left:18px;margin-top:8px;color:var(--muted)">
        <li>Teoría clave</li>
        <li>Ejemplos visuales</li>
        <li>Ejercicio práctico</li>
      </ul>
    </div>
  `;

  document.getElementById('backToList').addEventListener('click', ()=> {
    renderLessons();
  });

  document.getElementById('syncBtn').addEventListener('click', async ()=> {
    const remote = await fetchRemoteProgress();
    const nowCompleted = (remote||[]).map(Number).includes(lesson.id);
    lesson.progress = nowCompleted ? 100 : 0;
    const statusEl = document.getElementById('lessonStatus');
    if(statusEl) statusEl.textContent = nowCompleted ? 'Completada (sincronizada)' : 'No completada';
    renderLessons();
    updateProgressOverview();
  });
}

function markComplete(lesson, finishAll=false){
  // keep function but do not persist locally; only update UI state (server is source of truth)
  const idx = lessons.findIndex(x=>x.id===lesson.id);
  if(idx>-1){
    lessons[idx].progress = 100;
    updateProgressOverview();
    renderLessons();
    // removed reference to undefined 'sheet' variable to avoid runtime errors
  }
}

function updateProgressOverview(){
  const total = lessons.length;
  const done = lessons.filter(l=>l.progress>=100).length;
  const percent = Math.round((done/total)*100);
  const bar = document.querySelector('.progress-bar span');
  if(bar) bar.style.width = percent + '%';
  const txt = document.querySelector('.progress-text');
  if(txt) txt.textContent = `${percent}% completado`;
}

/* Nav button now toggles a simple inline course info panel inside resources/profile switching.
   Keep behavior simple: show a modal-like inline block by toggling the profile view to show course info. */
document.getElementById('navBtn').addEventListener('click', ()=> {
  // toggle a small info overlay inside profile view area
  const infoHtml = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="font-weight:700">Acerca del curso</div>
      <div style="color:var(--muted)">Aprende fundamentos, tipografía, color y composición con ejemplos prácticos y un reto final para tu portafolio.</div>
    </div>
  `;
  // If profile view is currently visible, hide it and return to home. Otherwise show the info in profile view.
  const isProfileVisible = profileView.style.display === 'block';
  if (isProfileVisible) {
    profileView.style.display = 'none';
    resourcesView.style.display = 'none';
    homeView.style.display = '';
    // optionally clear content to keep it fresh next time
    profileView.innerHTML = '';
  } else {
    resourcesView.style.display = 'none';
    profileView.style.display = 'block';
    homeView.style.display = 'none';
    profileView.innerHTML = infoHtml;
  }
});

// resume button uses merged progress
resumeBtn.addEventListener('click', ()=> {
  const next = lessons.find(l=>l.progress<100) || lessons[0];
  openLesson(next);
});

catalogBtn.addEventListener('click', ()=> {
  // show temario inside resources view
  resourcesView.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="font-weight:700">Temario</div>
      <ol style="padding-left:18px;color:var(--muted)">
        ${lessons.map(l=>`<li style="margin:8px 0">${l.title} <small style="color:var(--muted)"> — ${l.time}</small></li>`).join('')}
      </ol>
      <button class="primary" id="startAll">Comenzar desde el inicio</button>
    </div>
  `;
  resourcesView.style.display = 'block';
  profileView.style.display = 'none';
  homeView.style.display = 'none';
  document.getElementById('startAll').addEventListener('click', ()=> {
    resourcesView.style.display = 'none';
    homeView.style.display = '';
    openLesson(lessons[0]);
  });
});

// theme toggle remains
themeToggle.addEventListener('click', ()=>{
  const rootEl = document.documentElement;
  const cur = rootEl.getAttribute('data-theme');
  const next = cur === 'dark' ? null : 'dark';
  if(next) rootEl.setAttribute('data-theme','dark'); else rootEl.removeAttribute('data-theme');
});



/* removed sheet outside-click handler (no sheet used) */

// init: merge remote + cookie progress then render
/* Show splash then initialize app */
function showSplash(visibleDuration = 35000){
  return new Promise(resolve=>{
    const splash = document.getElementById('splash');
    const appEl = document.getElementById('app');
    if(!splash) return resolve();
    // Show splash immediately, hide underlying app while splash is visible
    splash.style.display = 'grid';
    splash.setAttribute('aria-hidden','false');
    if(appEl){
      appEl.style.visibility = 'hidden';
      appEl.setAttribute('aria-hidden','true');
    }
    // start entrance animation
    splash.classList.add('splash-in');

    let done = false;
    let fallbackTimer = null;
    let fullTimerRef = null;

    const cleanup = () => {
      if(done) return;
      done = true;
      splash.setAttribute('aria-hidden','true');
      splash.style.display = 'none';
      if(appEl){
        appEl.style.visibility = '';
        appEl.removeAttribute('aria-hidden');
      }
      // remove any listeners and timers
      splash.removeEventListener('animationend', onExitAnimationEnd);
      const skipBtn = document.getElementById('splashSkip');
      if(skipBtn) skipBtn.removeEventListener('click', onSkip);
      if(fullTimerRef) clearTimeout(fullTimerRef);
      if(fallbackTimer) clearTimeout(fallbackTimer);
      resolve();
    };

    // handler for the exit animation end only
    function onExitAnimationEnd(){
      cleanup();
    }

    function onSkip(){
      // immediately start exit animation and then cleanup via animationend or fallback
      // ensure we listen for exit animation end
      splash.removeEventListener('animationend', onExitAnimationEnd);
      splash.addEventListener('animationend', onExitAnimationEnd);
      splash.classList.remove('splash-in');
      splash.classList.add('splash-out');
      // set a safety fallback in case animationend doesn't fire
      if(fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = setTimeout(cleanup, 700);
    }

    // wire skip button if present
    const skipBtn = document.getElementById('splashSkip');
    if(skipBtn) skipBtn.addEventListener('click', onSkip);

    // After the requested visible duration, run exit animation then restore app.
    fullTimerRef = setTimeout(()=>{
      // Ensure we only attach the exit listener now so the entrance animation end doesn't hide splash early
      splash.removeEventListener('animationend', onExitAnimationEnd);
      splash.addEventListener('animationend', onExitAnimationEnd);

      // trigger exit animation
      splash.classList.remove('splash-in');
      splash.classList.add('splash-out');

      // fallback if animationend doesn't fire
      fallbackTimer = setTimeout(cleanup, 700);
    }, visibleDuration);

    // ultimate safety: ensure splash can't hang forever
    setTimeout(()=> {
      cleanup();
    }, visibleDuration + 3000);
  });
}

(async function init(){
  // show splash first (now 10s default)
  await showSplash(10000);

  // initial render and then sync state from remote only
  renderLessons();
  updateProgressOverview();
  await syncProgress();
  // ensure initial tab shows home
  homeView.style.display = '';
  resourcesView.style.display = 'none';
  profileView.style.display = 'none';
})();