// base para funcionar local e no GitHub Pages
const BASE = location.pathname.includes('/Dishcovery') || location.pathname.includes('/dishcovery')
  ? '/' + location.pathname.split('/')[1]
  : '';
const API = { index: `${BASE}/recipes/index.json` };

const $ = (s,r=document)=>r.querySelector(s);

// cartão para receitas LOCAIS (mantém o teu estilo)
const card = r => `
<article class="card">
  <img src="${r.images?.cover || 'https://via.placeholder.com/800x600?text=Receita'}" alt="${r.title}">
  <div class="pad">
    <div class="meta">${r.category || ''}</div>
    <h3><a href="${BASE}/r/${r.id}/">${r.title}</a></h3>
    <div class="meta">${r.totalTimeMin||'?'} min · ${r.servings||'?'} porções</div>
    <div class="badges">${(r.tags||[]).slice(0,3).map(t=>`<span class="chip">${t}</span>`).join('')}</div>
  </div>
</article>`;

async function jget(u){ const r = await fetch(u,{cache:'no-store'}); if(!r.ok) throw new Error(u); return r.json(); }
if ($('#year')) $('#year').textContent = new Date().getFullYear();

/* =====================
   HOME
===================== */
if (location.pathname.endsWith('/') || location.pathname.endsWith('/index.html')){
  jget(API.index).then(d=>{
    const list = d.recipes||[];
    const novas = [...list].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);
    $('#home-new').innerHTML = novas.map(card).join('');

    // ——— ligar pesquisa do HERO à API online ———
    const heroInput = $('#home-search');
    const resultsEl = $('#results-online');

    async function doOnlineSearch() {
      const term = heroInput.value.trim();
      if (!resultsEl) return;
      resultsEl.hidden = false;
      resultsEl.innerHTML = '<p>A procurar…</p>';
      try {
        const recipes = await searchOnlineRecipes({ term });
        renderOnlineCards(recipes);
        resultsEl.scrollIntoView({ behavior:'smooth', block:'start' });
      } catch (e) {
        resultsEl.innerHTML = `<p>Erro a obter receitas. ${e?.message||''}</p>`;
      }
    }

    if (heroInput) {
      heroInput.addEventListener('keydown', e=>{
        if(e.key==='Enter'){ e.preventDefault(); doOnlineSearch(); }
      });
    }
  }).catch(console.error);
}

/* =====================
   LISTA /receitas/
===================== */
if (location.pathname.includes('/receitas/')){
  (async()=>{
    const data = await jget(API.index);
    const ALL = data.recipes||[];
    const qEl=$('#q'), catEl=$('#f-categoria'), difEl=$('#f-dificuldade'), tEl=$('#f-tempo'), tagEl=$('#f-tag'), ordEl=$('#ordenar');
    // popular selects
    [...new Set(ALL.map(r=>r.category).filter(Boolean))].sort().forEach(c=>catEl.innerHTML+=`<option>${c}</option>`);
    [...new Set(ALL.flatMap(r=>r.tags||[]))].sort().forEach(t=>tagEl.innerHTML+=`<option>${t}</option>`);
    const fromHash=()=>{ const h=new URLSearchParams(location.hash.slice(1)); if(h.get('q')) qEl.value=decodeURIComponent(h.get('q')); if(h.get('categoria')) catEl.value=decodeURIComponent(h.get('categoria')); if(h.get('tag')) tagEl.value=decodeURIComponent(h.get('tag')); if(h.get('tempo')) tEl.value=decodeURIComponent(h.get('tempo')); };
    fromHash();
    function apply(){
      let v=[...ALL];
      const q=qEl.value.toLowerCase(), cat=catEl.value, dif=difEl.value, t=parseInt(tEl.value||0,10), tag=tagEl.value;
      if(q) v=v.filter(r=>[r.title,r.category,...(r.tags||[]),r.description||''].join(' ').toLowerCase().includes(q));
      if(cat) v=v.filter(r=>r.category===cat);
      if(dif) v=v.filter(r=>r.difficulty===dif);
      if(t) v=v.filter(r=>(r.totalTimeMin||999)<=t);
      if(tag) v=v.filter(r=>(r.tags||[]).includes(tag));
      switch(ordEl.value){case 'tempo': v.sort((a,b)=>(a.totalTimeMin||999)-(b.totalTimeMin||999));break;case 'titulo': v.sort((a,b)=>a.title.localeCompare(b.title));break;default: v.sort((a,b)=>(b.date||'').localeCompare(a.date||''));}
      $('#list').innerHTML = v.map(card).join('');
    }
    [qEl,catEl,difEl,tEl,tagEl,ordEl].forEach(el=>el.addEventListener('input',apply));
    addEventListener('hashchange',()=>{fromHash();apply();});
    apply();
  })();
}

/* =====================
   PÁGINA DE RECEITA /r/slug/
===================== */
if (location.pathname.includes('/r/')){
  (async()=>{
    const parts = location.pathname.replace(/\/$/,'').split('/');
    const slug = parts[parts.length-1] || parts[parts.length-2];
    const r = await jget(`${BASE}/recipes/${slug}.json`);
    document.title = `${r.title} — Dishcovery`;
    $('#recipe-page').innerHTML = `
      <div class="recipe-head">
        <div><img src="${r.images?.cover || 'https://via.placeholder.com/1200x800?text=Receita'}" alt="${r.title}" style="border-radius:18px"/></div>
        <div>
          <h1>${r.title}</h1>
          <div class="meta">${r.category||''}</div>
          <p class="meta">${r.totalTimeMin||'?'} min · ${r.servings||'?'} porções · ${r.difficulty||''}</p>
          <div class="badges">${(r.tags||[]).map(t=>`<span class="chip">${t}</span>`).join('')}</div>
          <div class="section"><p>${r.description||''}</p></div>
        </div>
      </div>
      <div class="section"><h2>Ingredientes</h2><ul class="list">${(r.ingredients||[]).map(i=>`<li>${i.original || `${i.qty??''} ${i.unit??''} ${i.name}`}</li>`).join('')}</ul></div>
      <div class="section"><h2>Passos</h2><ol class="list">${(r.steps||[]).map(s=>`<li>${s.text||s}${s.timeMin?` (${s.timeMin} min)`:''}${s.tempC?` — ${s.tempC}ºC`:''}</li>`).join('')}</ol></div>
      <div class="section"><a class="btn" href="javascript:window.print()">Imprimir</a></div>`;
  })();
}

/* ---------------- ÍNDICE A-Z ---------------- */
if (location.pathname.endsWith('/indice.html') || location.pathname.endsWith('/indice')) {
  (async () => {
    try {
      let data;
      try { data = await jget('/recipes/index.json'); }
      catch { data = await jget('recipes/index.json'); }

      const list = (data.recipes || []).slice().sort((a, b) => a.title.localeCompare(b.title));
      const container = $('#az-list');
      const input = $('#az-q');

      function draw(items) {
        if (!container) return;
        if (!items.length) {
          container.innerHTML = '<p class="meta">Sem resultados.</p>';
          return;
        }
        const by = items.reduce((acc, r) => {
          const k = (r.title?.[0] || '#').toUpperCase();
          (acc[k] = acc[k] || []).push(r);
          return acc;
        }, {});
        container.innerHTML = Object.keys(by).sort().map(letter => `
          <section id="az-${letter}">
            <h2>${letter}</h2>
            <ul>
              ${by[letter].map(r => `<li><a href="r/${r.id}/">${r.title}</a></li>`).join('')}
            </ul>
          </section>
        `).join('');
      }

      input?.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        draw(list.filter(r => r.title.toLowerCase().includes(q)));
      });

      draw(list);
    } catch (err) {
      console.error('[A-Z] erro:', err);
      const container = $('#az-list');
      if (container) container.innerHTML = '<p class="meta">Não foi possível carregar o índice.</p>';
    }
  })();
}

/* =====================
   Provider: TheMealDB (API pública)
===================== */
const THEMEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';

function mapMealToRecipe(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const m = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      const text = [m, ing].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      ingredients.push(text);
    }
  }
  const steps = (meal.strInstructions || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

  const approxTime = Math.min(90, Math.max(15, Math.round(steps.length * 1.2)));
  const difficulty = approxTime <= 20 ? 'easy' : approxTime <= 45 ? 'medium' : 'hard';

  const tags = (meal.strTags || '').split(',').map(t => t.trim()).filter(Boolean);

  return {
    id: meal.idMeal,
    title: meal.strMeal,
    image: meal.strMealThumb || '',
    url: meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`,
    servings: null,
    totalTimeMin: approxTime,
    difficulty,
    ingredients,
    steps,
    tags
  };
}

async function fetchMealsBySearch(term) {
  const url = `${THEMEALDB_BASE}/search.php?s=${encodeURIComponent(term)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Falha ao pesquisar na TheMealDB');
  const data = await r.json();
  return (data.meals || []).map(mapMealToRecipe);
}

async function fetchMealsByIngredient(ingredient) {
  const url = `${THEMEALDB_BASE}/filter.php?i=${encodeURIComponent(ingredient)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Falha ao filtrar por ingrediente');
  const data = await r.json();
  const light = data.meals || [];
  const picks = light.slice(0, 20);
  const details = await Promise.all(
    picks.map(async m => {
      const d = await fetch(`${THEMEALDB_BASE}/lookup.php?i=${m.idMeal}`).then(x => x.json());
      return d.meals && d.meals[0] ? mapMealToRecipe(d.meals[0]) : null;
    })
  );
  return details.filter(Boolean);
}

async function searchOnlineRecipes({ term = '', includeIngredient = '', maxTime = '' }) {
  const t = term.trim();
  const inc = (includeIngredient||'').trim();
  let results = [];

  if (t && inc) {
    const [byTerm, byIng] = await Promise.all([fetchMealsBySearch(t), fetchMealsByIngredient(inc)]);
    const ids = new Set(byIng.map(r => r.id));
    results = byTerm.filter(r => ids.has(r.id));
  } else if (t) {
    results = await fetchMealsBySearch(t);
  } else if (inc) {
    results = await fetchMealsByIngredient(inc);
  } else {
    results = await fetchMealsBySearch('chicken');
  }

  if (maxTime) {
    const max = Number(maxTime);
    results = results.filter(r => !r.totalTimeMin || r.totalTimeMin <= max);
  }
  return results;
}

// render de cartões ONLINE (estilo muito próximo do teu)
function renderOnlineCards(recipes) {
  const el = $('#results-online');
  if (!el) return;

  if (!recipes.length) {
    el.hidden = false;
    el.innerHTML = `<p>Sem resultados. Tenta outro termo/ingrediente.</p>`;
    return;
  }

  el.hidden = false;
  el.innerHTML = recipes.map(r => `
    <article class="card recipe-card">
      <img src="${r.image}" alt="${r.title}" loading="lazy">
      <div class="pad">
        <div class="meta">${r.tags?.[0] || ''}</div>
        <h3>${r.title}</h3>
        <p class="meta">${r.totalTimeMin ? `${r.totalTimeMin} min` : ''} ${r.difficulty ? `· ${r.difficulty}` : ''}</p>
        <div class="actions">
          <a class="btn" href="${r.url}" target="_blank" rel="noopener">Ver receita</a>
          <button class="btn-outline" data-try="${r.id}">⭐ Quero experimentar</button>
        </div>
      </div>
    </article>
  `).join('');

  el.querySelectorAll('button[data-try]').forEach(btn => {
    btn.addEventListener('click', () => toggleTryWishlist(btn.getAttribute('data-try')));
  });
}

/* =====================
   Wishlist (localStorage)
===================== */
const TRY_KEY = 'tryList:v1';
function getTryList(){ try { return JSON.parse(localStorage.getItem(TRY_KEY)) || [] } catch { return [] } }
function saveTryList(list){ localStorage.setItem(TRY_KEY, JSON.stringify(list)); updateTryCounter(); }
function toggleTryWishlist(id){ const s=new Set(getTryList()); s.has(id)?s.delete(id):s.add(id); saveTryList([...s]); }
function updateTryCounter(){ const el=document.querySelector('[data-try-counter]'); if (el) el.textContent=getTryList().length; }

// ready
document.addEventListener('DOMContentLoaded', updateTryCounter);
