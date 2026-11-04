import '@fontsource-variable/sora';
import '@fontsource-variable/manrope';
import '@fontsource-variable/caveat';
import Lenis from 'lenis';
import './styles.css';

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (p, a, b) => { const t = clamp01((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const band = (p, a, b, c, d) => Math.min(smooth(p, a, b), 1 - smooth(p, c, d));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const svgNS = 'http://www.w3.org/2000/svg';

// Curva cúbica (mesma notação do CSS), resolvida por Newton para usar em animações por JS.
const bezier = (x1, y1, x2, y2) => {
  const cx = 3 * x1; const bx = 3 * (x2 - x1) - cx; const ax = 1 - cx - bx;
  const cy = 3 * y1; const by = 3 * (y2 - y1) - cy; const ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (sx(t) - x) / d; }
    return sy(clamp01(t));
  };
};

const opening = root.classList.contains('opening') && !reduceMotion;
if (!opening) root.classList.add('intro-done', 'hero-in');

/* ---------- Filtro do traço à mão (uma vez por página) ---------- */
document.body.insertAdjacentHTML('afterbegin',
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><filter id="hc-rough" x="-5%" y="-20%" width="110%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter></svg>`);

/* ==========================================================================
   Rolagem suave (Lenis) e um único laço de quadros
   O Lenis interpola a roda do mouse quadro a quadro; as cenas leem a posição
   (leitura) e depois desenham (escrita), e as contínuas ainda perseguem o
   valor real com amortecimento exponencial, o que absorve qualquer degrau.
   ========================================================================== */
const lenis = !reduceMotion
  ? new Lenis({ autoRaf: false, lerp: 0.1, wheelMultiplier: 1, anchors: { offset: -84 }, allowNestedScroll: true })
  : null;

const scenes = [];
const tickers = new Set(); // animações curtas (tilt, ímã, peso) que pedem quadros enquanto se movem
let running = false;
let lastT = 0;
const TAU = 70;

function frame(now) {
  lenis?.raf(now);
  const vh = innerHeight;
  sweepReveals(vh);
  const targets = scenes.map((s) => s.measure(vh));
  const k = 1 - Math.exp(-Math.min(64, now - lastT) / TAU);
  lastT = now;
  let moving = !!lenis?.isScrolling;
  scenes.forEach((s, i) => {
    const target = targets[i];
    if (s.smooth) {
      if (s.value === undefined) s.value = target;
      else s.value += (target - s.value) * k;
      if (Math.abs(target - s.value) < 0.0004) s.value = target; else moving = true;
    } else s.value = target;
    if (s.value !== s.drawn) { s.render(s.value); s.drawn = s.value; }
  });
  tickers.forEach((t) => { if (!t(now)) tickers.delete(t); else moving = true; });
  if (moving) requestAnimationFrame(frame); else running = false;
}
const kick = () => { if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(frame); } };
const addTicker = (fn) => { tickers.add(fn); kick(); };

/* ---------- Navegação ---------- */
document.querySelectorAll('.nav__link').forEach((link) => {
  const href = link.getAttribute('href');
  if (href && !href.includes('#') && href !== '/' && location.pathname.startsWith(href)) link.setAttribute('aria-current', 'page');
});
document.querySelectorAll('.nav__list > li').forEach((li, i) => li.style.setProperty('--i', i));

const header = document.querySelector('[data-header]');
// O cabeçalho só muda de estado depois de andar uma distância real numa mesma direção:
// com a rolagem interpolada, cada quadro anda poucos pixels e uma regra por quadro piscaria.
let lastY = 0; let travel = 0; let hidden = false;
const setHidden = (h) => { if (h !== hidden) { hidden = h; header?.classList.toggle('is-hidden', h); } };
const updateHeader = () => {
  const y = scrollY;
  const dy = y - lastY;
  lastY = y;
  header?.classList.toggle('is-solid', y > 24);
  if (root.classList.contains('menu-open') || y < 480) { travel = 0; setHidden(false); return; }
  if (dy === 0) return;
  travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
  if (travel > 64) setHidden(true);
  else if (travel < -48) setHidden(false);
};
requestAnimationFrame(updateHeader);
addEventListener('scroll', updateHeader, { passive: true });

const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');
if (toggle && menu) {
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.nav__toggle-label').textContent = open ? 'Fechar' : 'Menu';
    menu.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);
    setHidden(false);
    document.querySelectorAll('main, .site-footer').forEach((el) => { el.inert = open; });
    if (open) { lenis?.stop(); menu.querySelector('a')?.focus(); } else lenis?.start();
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
  matchMedia('(min-width: 960px)').addEventListener('change', () => setOpen(false));
}

/* ==========================================================================
   Texto: rolagem de letras no hover, digitação ao vivo, leitura que acende
   ========================================================================== */
const charSpans = (text, cls) => [...text].map((ch, i) => `<span class="${cls}" style="--i:${i}">${ch === ' ' ? ' ' : ch.replace(/</g, '&lt;')}</span>`).join('');

// Links e botões: duas cópias empilhadas; no hover, cada letra sobe em cascata.
document.querySelectorAll('[data-roll]').forEach((el) => {
  // Sem hover (toque), o rolamento nunca aparece; nos botões o texto fica simples para poder quebrar
  // em telas estreitas em vez de vazar do cartão.
  if (!finePointer && el.closest('.btn')) return;
  const text = el.textContent.trim().replace(/\s+/g, ' ');
  const chars = charSpans(text, 'rc');
  el.innerHTML = `<span class="sr-only">${text}</span><span class="roll" aria-hidden="true"><span class="roll__a">${chars}</span><span class="roll__b">${chars}</span></span>`;
});

// Digitação: as letras já ocupam o lugar e acendem uma a uma; o cursor segue a última.
const typeItems = [];
document.querySelectorAll('[data-type]').forEach((el) => {
  if (reduceMotion) return;
  const text = el.textContent.trim().replace(/\s+/g, ' ');
  el.innerHTML = text.split(' ').map((word) => `<span class="tw" style="white-space:nowrap">${charSpans(word, 'tc')}</span>`).join(' ');
  el.classList.add('typing');
  typeItems.push(el);
});
const typeOut = (el) => {
  const chars = [...el.querySelectorAll('.tc')];
  const base = Number(el.dataset.typeSpeed) || 34;
  let i = 0;
  const step = () => {
    chars[i - 1]?.classList.remove('last');
    if (i >= chars.length) { chars.at(-1)?.classList.add('last'); el.classList.add('typed'); return; }
    const c = chars[i];
    c.classList.add('on', 'last');
    i++;
    const ch = c.textContent;
    const pause = /[.,:;!?…]/.test(ch) ? 180 : 0;
    setTimeout(step, base * (0.55 + Math.random() * 0.9) + pause);
  };
  setTimeout(step, Number(el.dataset.typeDelay) || 120);
};

// Leitura: cada palavra acende conforme o parágrafo atravessa a tela.
const scrubs = [];
document.querySelectorAll('[data-scrub]').forEach((el) => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'sw'; w.textContent = part;
      frag.append(w);
    });
    node.replaceWith(frag);
  });
  scrubs.push({ el, words: [...el.querySelectorAll('.sw')] });
});

// Peso variável: as letras perto do cursor afinam, as distantes continuam pesadas.
const weightGroups = [];
document.querySelectorAll('[data-weight]').forEach((el) => {
  const text = el.textContent;
  el.setAttribute('aria-label', text.trim());
  el.innerHTML = [...text].map((ch) => (ch === ' ' ? ' ' : `<span class="wc" aria-hidden="true">${ch}</span>`)).join('');
  weightGroups.push({ el, chars: [...el.querySelectorAll('.wc')].map((c) => ({ c, w: 700, t: 700, x: 0, y: 0 })) });
});
if (finePointer && !reduceMotion && weightGroups.length) {
  let px = -9999; let py = -9999;
  const measureChars = () => weightGroups.forEach((g) => g.chars.forEach((o) => {
    const r = o.c.getBoundingClientRect(); o.x = r.left + r.width / 2; o.y = r.top + r.height / 2; o.h = r.height;
  }));
  const tick = () => {
    let active = false;
    weightGroups.forEach((g) => g.chars.forEach((o) => {
      const d = Math.hypot(px - o.x, py - o.y);
      const reach = Math.max(140, o.h * 1.1);
      o.t = 700 - 520 * (1 - smooth(d, 0, reach));
      o.w += (o.t - o.w) * 0.16;
      if (Math.abs(o.t - o.w) > 0.5) active = true; else o.w = o.t;
      const v = Math.round(o.w);
      if (v !== o.drawn) { o.c.style.setProperty('--w', v); o.drawn = v; }
    }));
    return active;
  };
  let measured = false;
  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    const near = weightGroups.some((g) => { const r = g.el.getBoundingClientRect(); return py > r.top - 200 && py < r.bottom + 200; });
    if (!near) return;
    if (!measured) { measureChars(); measured = true; }
    addTicker(tick);
  }, { passive: true });
  addEventListener('scroll', () => { measured = false; px = -9999; addTicker(tick); }, { passive: true });
  addEventListener('resize', () => { measured = false; });
}

/* ==========================================================================
   Traço à mão: sublinhado, círculo, risco e balão
   ========================================================================== */
const DOODLES = {
  underline: ['0 0 200 20', 'M3 13 C 30 7, 70 5, 110 8 C 140 10, 170 14, 197 7'],
  circle: ['0 0 200 100', 'M112 8 C 60 4, 10 22, 8 50 C 6 80, 56 96, 104 94 C 156 92, 194 74, 192 46 C 190 20, 150 6, 96 10 C 74 12, 56 18, 44 26'],
  strike: ['0 0 200 40', 'M4 24 C 50 14, 120 18, 196 10 C 150 22, 70 26, 8 34 C 60 26, 140 30, 194 22'],
  bubble: ['0 0 240 120', 'M60 96 C 24 92, 6 74, 8 52 C 10 24, 50 8, 120 8 C 190 8, 232 24, 232 54 C 232 84, 196 98, 128 98 C 108 98, 92 98, 80 97 L 52 116 L 60 96'],
};
const makeSvg = (viewBox, d, cls) => {
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', cls);
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('pathLength', '1');
  svg.append(path);
  return svg;
};
document.querySelectorAll('[data-doodle]').forEach((el) => {
  const [vb, d] = DOODLES[el.dataset.doodle] || DOODLES.underline;
  el.append(makeSvg(vb, d, `doodle doodle--${el.dataset.doodle}`));
});
const drawDoodles = (scope, delay) => {
  scope.querySelectorAll(':scope .doodle:not(.is-drawn)').forEach((svg) => {
    if (delay !== undefined) svg.style.setProperty('--draw-d', `${delay}s`);
    requestAnimationFrame(() => svg.classList.add('is-drawn'));
  });
};

// Sintomas: um risco feito à mão, linha por linha, segue a rolagem.
const symptomLists = document.querySelectorAll('[data-symptoms]');
const buildStrike = (span) => {
  const w = span.offsetWidth; const h = span.offsetHeight;
  const lh = parseFloat(getComputedStyle(span).lineHeight) || h;
  const lines = Math.max(1, Math.round(h / lh));
  let d = '';
  for (let k = 0; k < lines; k++) {
    const y = (k + 0.55) * lh + (k % 2 ? 2 : -2);
    const last = k === lines - 1;
    const xEnd = last ? w * (0.75 + Math.random() * 0.25) : w;
    d += `${k ? ' L' : 'M'} 2 ${y.toFixed(1)} C ${(w * 0.3).toFixed(1)} ${(y - 6).toFixed(1)}, ${(w * 0.7).toFixed(1)} ${(y + 5).toFixed(1)}, ${xEnd.toFixed(1)} ${(y - 2).toFixed(1)}`;
  }
  let svg = span.querySelector('.symptom__strike');
  if (!svg) { svg = makeSvg('0 0 1 1', '', 'doodle symptom__strike'); span.append(svg); }
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.style.cssText = 'left:0;top:0;width:100%;height:100%';
  svg.querySelector('path').setAttribute('d', d);
};
const symptomSpans = [...document.querySelectorAll('.symptom__text')];
symptomSpans.forEach((s) => { s.style.display = 'inline-block'; });
const rebuildStrikes = () => symptomSpans.forEach(buildStrike);
if (symptomSpans.length) {
  requestAnimationFrame(rebuildStrikes);
  document.fonts?.ready.then(rebuildStrikes);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(rebuildStrikes, 150); });
}

/* ==========================================================================
   Títulos por palavra, agrupados em linhas na hora da entrada
   ========================================================================== */
function splitWords(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement.closest('svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'w';
      const inner = document.createElement('span');
      inner.textContent = part;
      w.append(inner);
      frag.append(w);
    });
    node.replaceWith(frag);
  });
  el.classList.add('split');
}
function assignLines(el) {
  let top = null; let line = -1; let wi = 0;
  el.querySelectorAll('.w').forEach((w) => {
    const t = w.offsetTop + (w.offsetParent !== el.offsetParent && w.offsetParent ? w.offsetParent.offsetTop : 0);
    if (top === null || Math.abs(t - top) > 6) { line++; top = t; wi = 0; }
    w.style.setProperty('--line', line);
    w.style.setProperty('--wi', wi++);
  });
  const delay = (line * 90 + 800) / 1000;
  el.style.setProperty('--emph-delay', `${delay}s`);
  return delay;
}

/* ---------- Reveals ---------- */
const pending = new Set(document.querySelectorAll('[data-reveal]'));
const reveal = (el) => {
  if (!pending.has(el)) return;
  pending.delete(el);
  let delay = 0.5;
  if (el.hasAttribute('data-split') && !reduceMotion) {
    splitWords(el);
    delay = assignLines(el);
    el.getBoundingClientRect();
  }
  el.classList.add('is-in');
  drawDoodles(el, delay);
};
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { reveal(entry.target); io.unobserve(entry.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  pending.forEach((el) => io.observe(el));
} else {
  [...pending].forEach(reveal);
}
function sweepReveals(vh) {
  if (!pending.size) return;
  const hits = [];
  pending.forEach((el) => { if (el.getBoundingClientRect().top < vh * 0.9) hits.push(el); });
  hits.forEach(reveal);
}

// Entradas pontuais: digitação, traços soltos, contadores e adesivos.
const once = (els, fn, opts = { threshold: 0.4 }) => {
  if (!els.length) return;
  if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach(fn); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); }
  }), opts);
  els.forEach((el) => io.observe(el));
};
const heroReady = (fn) => (root.classList.contains('hero-in') ? fn() : addEventListener('hc:hero', fn, { once: true }));
once(typeItems, (el) => heroReady(() => typeOut(el)), { threshold: 0.6 });
once([...document.querySelectorAll('svg[data-draw]')], (svg) => {
  svg.style.setProperty('--draw-d', `${Number(svg.dataset.drawDelay) || 0.15}s`);
  svg.classList.add('is-drawn');
}, { threshold: 0.5 });
// Traços em textos que não têm entrada própria desenham ao aparecer.
once([...document.querySelectorAll('.ink')].filter((el) => !el.closest('[data-reveal]') && !el.hasAttribute('data-doodle-late')),
  (el) => drawDoodles(el, 0.2), { threshold: 0.8 });
once([...document.querySelectorAll('[data-stickers]')], (el) => {
  [...el.children].forEach((li, i) => li.style.setProperty('--i', i));
  el.classList.add('is-in');
}, { threshold: 0.3 });
once([...document.querySelectorAll('[data-count]')], (el) => {
  const to = Number(el.dataset.count); const from = Number(el.dataset.countFrom) || 0;
  const t0 = performance.now(); const dur = 1500;
  el.textContent = String(from);
  addTicker((now) => {
    const t = clamp01((now - t0) / dur);
    const v = Math.round(lerp(from, to, easeOut(t)));
    if (String(v) !== el.textContent) el.textContent = String(v);
    return t < 1;
  });
}, { threshold: 0.6 });

// O sublinhado do hero espera o título assentar.
heroReady(() => {
  const late = document.querySelector('[data-doodle-late] .doodle');
  if (late) { late.style.setProperty('--draw-d', '0.9s'); late.style.setProperty('--draw-t', '1s'); requestAnimationFrame(() => late.classList.add('is-drawn')); }
});

/* ==========================================================================
   Cursor: cartões que inclinam com luz própria, botões-ímã
   ========================================================================== */
if (finePointer && !reduceMotion) {
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const max = el.classList.contains('offer') ? 5 : 7;
    let tx = 0; let ty = 0; let x = 0; let y = 0;
    const tick = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      el.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
      const settled = Math.abs(tx - x) < 0.001 && Math.abs(ty - y) < 0.001;
      return !settled;
    };
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width; const ny = (e.clientY - r.top) / r.height;
      tx = nx * 2 - 1; ty = ny * 2 - 1;
      el.style.setProperty('--gx', `${(nx * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(ny * 100).toFixed(1)}%`);
      addTicker(tick);
    });
    el.addEventListener('pointerleave', () => { tx = 0; ty = 0; addTicker(tick); });
  });

  document.querySelectorAll('[data-magnet]').forEach((el) => {
    let tx = 0; let ty = 0; let x = 0; let y = 0;
    const tick = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      el.style.setProperty('--mx', `${x.toFixed(2)}px`);
      el.style.setProperty('--my', `${y.toFixed(2)}px`);
      return Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05;
    };
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * 0.22;
      ty = (e.clientY - (r.top + r.height / 2)) * 0.35;
      addTicker(tick);
    });
    el.addEventListener('pointerleave', () => { tx = 0; ty = 0; addTicker(tick); });
  });
}

/* ==========================================================================
   Dúvidas: abre e fecha pela altura real, com uma resposta por vez
   ========================================================================== */
document.querySelectorAll('details.qa').forEach((qa) => {
  const summary = qa.querySelector('summary');
  const body = qa.querySelector('.qa__a');
  if (qa.open) qa.classList.add('is-open');
  let anim = null;
  const ease = 'cubic-bezier(0.65, 0, 0.35, 1)';
  const close = () => {
    if (!qa.open) return;
    const h = body.offsetHeight;
    qa.classList.remove('is-open');
    anim?.cancel();
    if (reduceMotion) { qa.open = false; return; }
    anim = body.animate([{ height: `${h}px` }, { height: '0px' }], { duration: Math.min(620, 320 + h * 0.8), easing: ease });
    anim.onfinish = () => { qa.open = false; anim = null; };
  };
  const open = () => {
    anim?.cancel();
    qa.open = true;
    const h = body.offsetHeight;
    requestAnimationFrame(() => qa.classList.add('is-open'));
    if (reduceMotion) return;
    anim = body.animate([{ height: '0px' }, { height: `${h}px` }], { duration: Math.min(700, 360 + h * 0.9), easing: ease });
    anim.onfinish = () => { anim = null; };
    qa.closest('.faq__list')?.querySelectorAll('details.qa[open]').forEach((o) => { if (o !== qa) o.dispatchEvent(new Event('qa:close')); });
  };
  qa.addEventListener('qa:close', close);
  summary.addEventListener('click', (e) => {
    e.preventDefault();
    if (qa.open && qa.classList.contains('is-open')) close(); else open();
  });
});

/* ==========================================================================
   Formação · "Para quem é": autodiagnóstico de três itens
   O veredito depende de quais itens foram marcados, não só de quantos:
   quem não quer aprender a fazer vai para a M7; quem ainda não opera, para as táticas.
   ========================================================================== */
const fit = document.querySelector('[data-fit]');
if (fit) {
  const items = [...fit.querySelectorAll('[data-fit-item]')];
  const count = fit.querySelector('[data-fit-count]');
  const verdict = fit.querySelector('.fit__verdict');
  const title = fit.querySelector('[data-fit-title]');
  const text = fit.querySelector('[data-fit-text]');
  const cta = fit.querySelector('[data-fit-cta]');
  const routes = Object.fromEntries([...fit.querySelectorAll('[data-route]')].map((r) => [r.dataset.route, r]));
  const verdicts = {
    none: ['Comece marcando os itens.', 'Cada item é um sinal de que a Formação foi pensada para a sua fase.'],
    some: ['Bom começo.', 'Marque o que mais for verdade para a sua loja. Se algum não se aplicar, há outro caminho logo abaixo.'],
    m7: ['Talvez você queira delegar.', 'Se a ideia é ter um time executando o marketing, a Assessoria M7 é o caminho mais direto.'],
    tatica: ['Comece menor.', 'Para quem ainda está estruturando a loja, as formações táticas têm turmas menores e foco em resultado rápido.'],
    match: ['Perfil da Formação Varejo.', 'Você já opera, quer margem e prefere aprender a fazer. É exatamente para quem a Formação foi feita.'],
  };
  let current = 'none';
  let swapTimer;
  const update = () => {
    const on = items.map((b) => b.getAttribute('aria-pressed') === 'true');
    const n = on.filter(Boolean).length;
    fit.style.setProperty('--fit', n);
    count.textContent = String(n);
    let key = n === 0 ? 'none' : 'some';
    if (n === 3) key = 'match';
    else if (on[0] && on[1] && !on[2]) key = 'm7';
    else if (!on[0] && on[2]) key = 'tatica';
    fit.classList.toggle('is-match', key === 'match');
    routes.m7?.classList.toggle('is-suggested', key === 'm7');
    routes.tatica?.classList.toggle('is-suggested', key === 'tatica');
    if (key === current) return;
    current = key;
    clearTimeout(swapTimer);
    verdict.classList.add('is-swapping');
    swapTimer = setTimeout(() => {
      [title.textContent, text.textContent] = verdicts[key];
      cta.hidden = key !== 'match';
      verdict.classList.remove('is-swapping');
    }, reduceMotion ? 0 : 260);
  };
  items.forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    update();
  }));
}

/* ==========================================================================
   Cenas ligadas à rolagem
   ========================================================================== */
const scene = (s) => { scenes.push(s); return s; };

// Imagens que se abrem: começam recolhidas num quadro e ampliadas, e se assentam.
document.querySelectorAll('[data-unveil]').forEach((el) => scene({
  smooth: true,
  measure: (vh) => { const r = el.getBoundingClientRect(); return r.bottom < -50 ? 0 : 1 - easeOut(clamp01((vh - r.top) / (vh * 0.8))); },
  render: (u) => el.style.setProperty('--u-in', u.toFixed(4)),
}));

document.querySelectorAll('[data-parallax]').forEach((el) => scene({
  smooth: true,
  measure: (vh) => { const r = el.getBoundingClientRect(); return clamp01((vh - r.top) / (vh + r.height)); },
  render: (p) => el.style.setProperty('--p', p.toFixed(4)),
}));

// Leitura que acende.
scrubs.forEach(({ el, words }) => scene({
  smooth: true,
  measure: (vh) => { const r = el.getBoundingClientRect(); return clamp01((vh * 0.82 - r.top) / (r.height + vh * 0.3)); },
  render: (p) => {
    const n = Math.round(p * words.length);
    if (n === el._lit) return;
    el._lit = n;
    words.forEach((w, i) => w.classList.toggle('lit', i < n));
  },
}));

// Sintomas riscados.
symptomLists.forEach((list) => [...list.children].forEach((li) => scene({
  smooth: true,
  // Um único valor de 0 a 2: primeiro a frase entra (0→1), depois é riscada (1→2).
  measure: (vh) => { const r = li.getBoundingClientRect(); return clamp01((vh * 1.02 - r.top) / (vh * 0.3)) + clamp01((vh * 0.68 - r.top) / (vh * 0.22)); },
  render: (v) => {
    const sp = clamp01(v - 1);
    li.style.setProperty('--se', clamp01(v).toFixed(4));
    li.style.setProperty('--sp', sp.toFixed(4));
    li.classList.toggle('is-struck', sp > 0.55);
  },
})));

// Pilares do método: cada palavra se preenche, e só a descrição dela fica aberta.
const pillarsPin = document.querySelector('[data-pillars]');
if (pillarsPin) {
  const items = [...pillarsPin.querySelectorAll('.pillar')];
  const names = items.map((li) => li.querySelector('.pillar__name'));
  const index = pillarsPin.querySelector('[data-pillar-index]');
  items.forEach((li) => {
    const body = li.querySelector('.pillar__body');
    const inner = document.createElement('div');
    inner.className = 'pillar__inner';
    inner.append(...body.childNodes);
    body.append(inner);
  });
  names.forEach((n) => n.setAttribute('data-text', n.textContent));
  let active = -1;
  scene({
    smooth: true,
    measure: (vh) => { const r = pillarsPin.getBoundingClientRect(); return clamp01(-r.top / Math.max(1, r.height - vh)); },
    render: (p) => {
      names.forEach((n, i) => n.style.setProperty('--f', smooth(p, 0.04 + i * 0.3, 0.28 + i * 0.3).toFixed(4)));
      const a = Math.min(items.length - 1, Math.max(0, Math.floor((p - 0.02) / 0.3)));
      if (a !== active) {
        active = a;
        items.forEach((li, i) => li.classList.toggle('is-active', i === a));
        if (index) index.textContent = String(a + 1).padStart(2, '0');
      }
    },
  });
}

// Jornada: no desktop, a trilha anda na horizontal; no celular, a etapa da vez acende.
const journey = document.querySelector('[data-journey]');
if (journey) {
  const track = journey.querySelector('[data-journey-track]');
  const steps = [...track.querySelectorAll('.step')];
  const index = journey.querySelector('[data-journey-index]');
  const wide = matchMedia('(min-width: 900px)');
  let maxX = 0;
  const readTrack = () => { maxX = Math.max(0, track.scrollWidth - innerWidth); };
  addEventListener('resize', () => { maxX = -1; });
  let current = -1;
  const setCurrent = (c) => {
    if (c === current) return;
    current = c;
    steps.forEach((s, i) => { s.classList.toggle('is-current', i === c); s.classList.toggle('is-past', i < c); });
    if (index) index.textContent = String(c + 1).padStart(2, '0');
  };
  scene({
    smooth: true,
    measure: (vh) => {
      const r = journey.getBoundingClientRect();
      if (wide.matches && root.classList.contains('motion')) return clamp01(-r.top / Math.max(1, r.height - vh));
      return -1 - clamp01((vh * 0.6 - steps[0].getBoundingClientRect().top) / Math.max(1, r.height - vh * 0.4)); // modo vertical
    },
    render: (p) => {
      if (p >= 0) {
        if (maxX <= 0) readTrack();
        const x = easeInOut(smooth(p, 0.05, 0.95)) * maxX;
        track.style.setProperty('--jx', x.toFixed(1));
        track.style.setProperty('--jp', smooth(p, 0.02, 0.92).toFixed(4));
        setCurrent(Math.min(steps.length - 1, Math.floor(smooth(p, 0.02, 0.9) * steps.length)));
      } else {
        const vh = innerHeight;
        let c = 0;
        steps.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * 0.62) c = i; });
        setCurrent(c);
      }
    },
  });
}

// M7: lado a lado. Dispara uma vez quando a tabela aparece; o CSS escalona linhas e checks.
const vs = document.querySelector('[data-vs]');
if (vs) once([vs.querySelector('.vs__table')], () => vs.classList.add('is-run'), { threshold: 0.25 });

// Rodapé: a folha de conteúdo sobe e ele aparece, com a palavra gigante subindo letra a letra.
const footer = document.querySelector('[data-footer]');
const mainEl = document.querySelector('main');
if (footer && mainEl) {
  const inner = footer.querySelector('[data-footer-inner]');
  const letters = [...footer.querySelectorAll('.site-footer__word .wc')];
  let fh = 0; let tall = false;
  const readFooter = () => {
    footer.classList.remove('is-tall');
    fh = footer.offsetHeight;
    tall = fh > innerHeight * 0.94;
    footer.classList.toggle('is-tall', tall);
  };
  addEventListener('resize', () => { fh = 0; });
  scene({
    smooth: true,
    measure: (vh) => {
      if (!fh) readFooter();
      const b = mainEl.getBoundingClientRect().bottom;
      if (tall) return clamp01((vh - footer.getBoundingClientRect().top) / (fh * 0.8));
      return clamp01((vh - b) / fh);
    },
    render: (p) => {
      inner.style.setProperty('--fp-off', tall ? '0' : ((1 - easeOut(p)) * fh * 0.32).toFixed(1));
      letters.forEach((l, i) => l.style.setProperty('--fw', smooth(p, 0.35 + i * 0.045, 0.75 + i * 0.03).toFixed(4)));
    },
  });
}

/* ==========================================================================
   Hero da home: o filme em tela cheia se recolhe para um quadro com a rolagem.
   ========================================================================== */
const intro = document.querySelector('[data-intro]');
const stage = intro?.querySelector('[data-intro-stage]');
if (intro) {
  const film = intro.querySelector('[data-film]');
  let vw = 0; let sh = 0;
  const readDims = () => { vw = stage.clientWidth; sh = stage.clientHeight; };
  addEventListener('resize', () => { vw = 0; });
  let hwDrawn = '';
  scene({
    smooth: true,
    measure: (vh) => {
      if (!vw) readDims();
      const r = intro.getBoundingClientRect();
      return clamp01(-r.top / Math.max(1, r.height - vh));
    },
    render: (p) => {
      const desktop = vw >= 900;
      const hh = 68;
      const cw = desktop ? Math.min(vw * 0.34, 520) : vw - 2 * Math.max(16, Math.min(48, vw * 0.04));
      const ch = desktop ? Math.min((sh - hh) * 0.66, 600) : Math.min((sh - hh) * 0.48, 420);
      const cx = vw / 2;
      const cy = desktop ? hh + (sh - hh) / 2 : hh + 16 + ch / 2;
      const z = easeInOut(smooth(p, 0.06, 0.5));
      const copy = smooth(p, 0, 0.14);
      const notes = desktop
        ? [smooth(p, 0.48, 0.58), smooth(p, 0.58, 0.68), smooth(p, 0.68, 0.78)]
        : [band(p, 0.46, 0.54, 0.62, 0.68), band(p, 0.62, 0.68, 0.76, 0.82), smooth(p, 0.78, 0.84)];
      stage.style.setProperty('--copy', copy.toFixed(4));
      stage.style.setProperty('--z', z.toFixed(4));
      const hw = `${cw.toFixed(0)}px`;
      if (hw !== hwDrawn) { stage.style.setProperty('--hw', hw); hwDrawn = hw; }
      notes.forEach((n, i) => stage.style.setProperty(`--n${i + 1}`, n.toFixed(4)));
      stage.classList.toggle('has-notes', notes.some((n) => n > 0));
      stage.classList.toggle('copy-gone', copy > 0.98);
      if (z < 0.0005) { film.style.clipPath = ''; film.style.transform = ''; return; }
      // O quadro é desenhado na tela; como o filme também recua (escala k), convertemos para o espaço dele.
      const k = 1 - 0.08 * z;
      const L = lerp(0, cx - cw / 2, z); const R = lerp(vw, cx + cw / 2, z);
      const T = lerp(0, cy - ch / 2, z); const B = lerp(sh, cy + ch / 2, z);
      const lx = cx + (L - cx) / k; const rx = cx + (R - cx) / k;
      const ty = cy + (T - cy) / k; const by = cy + (B - cy) / k;
      const rad = lerp(0, 28, z) / k;
      film.style.transformOrigin = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
      film.style.transform = `scale(${k.toFixed(4)})`;
      film.style.clipPath = `inset(${ty.toFixed(1)}px ${(vw - rx).toFixed(1)}px ${(sh - by).toFixed(1)}px ${lx.toFixed(1)}px round ${rad.toFixed(1)}px)`;
    },
  });
}

/* ==========================================================================
   Abertura (primeira visita): a marca se escreve no papel; a página sobe por
   baixo e a empurra até o cabeçalho.
   ========================================================================== */
const finishOpening = () => {
  if (root.classList.contains('intro-done')) return;
  root.classList.add('hero-in', 'intro-done');
  dispatchEvent(new Event('hc:hero'));
  stage?.style.removeProperty('--rise');
  document.querySelector('[data-loader]')?.remove();
  lenis?.start();
  kick();
  dispatchEvent(new Event('hc:opened'));
};
if (opening) {
  const loader = document.querySelector('[data-loader]');
  const paper = loader.querySelector('[data-loader-paper]');
  const brand = loader.querySelector('[data-loader-brand]');
  const word = loader.querySelector('[data-loader-word]');
  const swoosh = loader.querySelector('.loader__swoosh');
  const target = document.querySelector('[data-brand]');
  word.innerHTML = charSpans(word.textContent, 'lc');
  lenis?.stop();
  setTimeout(finishOpening, 6000); // salvaguarda

  const ease = bezier(0.76, 0, 0.24, 1);
  const brandEase = bezier(0.65, 0, 0.3, 1);
  let phase = 0; let t0 = 0; let dur = 1200; let s0 = 2.4; let x0 = 0; let y0 = 0; let heroFired = false; let whiteWord = false;
  let rush = false;

  const place = () => {
    const vw = innerWidth; const vh = innerHeight;
    const bw = brand.offsetWidth; const bh = brand.offsetHeight;
    s0 = Math.max(1.8, Math.min(3.4, (vw * 0.46) / bw));
    x0 = (vw - bw * s0) / 2; y0 = (vh - bh * s0) / 2;
    brand.style.transform = `translate(${x0}px, ${y0}px) scale(${s0})`;
    return { bw, bh };
  };
  const rise = (now) => {
    const t = clamp01((now - t0) / dur);
    const e = ease(t);
    const vh = innerHeight;
    paper.style.clipPath = `inset(0 0 ${(e * 100).toFixed(2)}% 0)`;
    stage?.style.setProperty('--rise', `${((1 - e) * vh * 0.22).toFixed(1)}px`);
    const tr = target.getBoundingClientRect();
    const b = brandEase(clamp01(t * 1.08));
    const s = Math.exp(lerp(Math.log(s0), 0, b));
    brand.style.transform = `translate(${lerp(x0, tr.left, b).toFixed(2)}px, ${lerp(y0, tr.top + (tr.height - brand.offsetHeight) / 2, b).toFixed(2)}px) scale(${s.toFixed(4)})`;
    // Quando a borda do papel passa pela marca, ela troca para a cor do cabeçalho.
    const edge = vh * (1 - e);
    const by = brand.getBoundingClientRect();
    if (!whiteWord && edge < by.top + by.height * 0.6) { whiteWord = true; word.style.transition = 'color 0.35s'; word.style.color = '#fff'; }
    if (!heroFired && t > 0.5) { heroFired = true; root.classList.add('hero-in'); dispatchEvent(new Event('hc:hero')); }
    if (t >= 1) { finishOpening(); return; }
    requestAnimationFrame(rise);
  };
  const startRise = (fast) => {
    if (phase === 2) return;
    phase = 2;
    dur = fast ? 650 : 1250;
    swoosh.style.transition = 'opacity 0.3s'; swoosh.style.opacity = '0';
    requestAnimationFrame((now) => { t0 = now; requestAnimationFrame(rise); });
  };
  const start = () => {
    place();
    root.classList.add('loader-go');
    phase = 1;
    setTimeout(() => startRise(rush), rush ? 250 : 1650);
  };
  // A marca só se escreve com a fonte pronta, para não trocar de desenho no meio.
  Promise.race([document.fonts?.ready || Promise.resolve(), new Promise((r) => setTimeout(r, 700))]).then(() => requestAnimationFrame(start));
  // Rolar, tocar ou teclar durante a abertura a apressa.
  const hurry = () => {
    rush = true;
    if (phase === 1) startRise(true);
    else if (phase === 2 && dur > 650) { const now = performance.now(); const t = clamp01((now - t0) / dur); dur = 650; t0 = now - t * 650; }
  };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => addEventListener(ev, hurry, { passive: true, once: true }));
}

if (!reduceMotion) {
  kick();
  addEventListener('scroll', kick, { passive: true });
  addEventListener('wheel', kick, { passive: true });
  addEventListener('resize', kick);
  lenis?.on('scroll', kick);
}

/* ---------- Filme do hero ---------- */
const video = document.querySelector('[data-hero-video]');
const filmToggle = document.querySelector('[data-hero-toggle]');

function setupFilm() {
  if (!video || !filmToggle) return;
  const conn = navigator.connection;
  if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType || '')) return; // Conexão lenta: o pôster é a abertura.

  const tall = matchMedia('(max-aspect-ratio: 9/10)').matches;
  const base = `/media/hero-${tall ? 'tall' : 'wide'}`;
  [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(([ext, type]) => {
    if (!video.canPlayType(type)) return;
    const s = document.createElement('source');
    s.src = `${base}.${ext}`; s.type = type;
    video.append(s);
  });

  const film = video.closest('[data-film]');
  const label = filmToggle.querySelector('[data-hero-toggle-label]');
  let userPaused = reduceMotion;
  const setPaused = (paused) => {
    filmToggle.setAttribute('aria-pressed', String(paused));
    label.textContent = paused ? 'Reproduzir vídeo' : 'Pausar vídeo';
  };
  const play = () => video.play().then(() => setPaused(false)).catch(() => setPaused(true));

  video.addEventListener('playing', () => film.classList.add('is-playing'));
  video.addEventListener('loadeddata', () => { filmToggle.hidden = false; }, { once: true });
  video.addEventListener('error', () => { filmToggle.hidden = true; }, true);
  filmToggle.addEventListener('click', () => {
    if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); setPaused(true); }
  });

  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) video.pause();
    else if (!userPaused) play();
  }).observe(film);

  video.preload = 'auto';
  video.load();
  setPaused(userPaused);
  if (!userPaused) play();
}

// O vídeo só começa a carregar depois da abertura, para não disputar quadros com ela.
const startFilm = () => (opening && !root.classList.contains('intro-done') ? addEventListener('hc:opened', () => setTimeout(setupFilm, 150), { once: true }) : setupFilm());
if (document.readyState === 'complete') startFilm();
else addEventListener('load', startFilm, { once: true });
