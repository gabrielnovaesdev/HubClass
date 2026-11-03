// Harness do Processo Testador: capturas por seção, medição de fluidez e gravação da abertura.
// Uso:
//   node scripts/qa.mjs shots <rótulo> [url]   → qa/<rótulo>/<viewport>-<seção>.png
//   node scripts/qa.mjs perf [url]             → fps e quadros longos em rolagem lenta, rápida e reversa
//   node scripts/qa.mjs record [url]           → qa/abertura-<viewport>.mp4 (primeira visita, cache vazio)
//   node scripts/qa.mjs checks [url]           → âncora, retorno na sessão, movimento reduzido
import puppeteer from 'puppeteer-core';
import { mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [, , cmd = 'shots', arg1, arg2] = process.argv;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const viewports = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const launch = () => puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
});

// Rola de verdade até um elemento, para que reveals e cenas rodem como para um visitante.
async function scrollToSelector(page, selector, offset = 0) {
  await page.evaluate(async (sel, off) => {
    const el = document.querySelector(sel);
    const max = document.documentElement.scrollHeight - innerHeight;
    const target = Math.min(max, Math.max(0, el.getBoundingClientRect().top + scrollY + off));
    for (let i = 0; i < 2000 && Math.abs(scrollY - target) > 4; i++) {
      scrollBy(0, Math.sign(target - scrollY) * Math.min(120, Math.abs(target - scrollY)));
      await new Promise((r) => requestAnimationFrame(r));
    }
  }, selector, offset);
  await wait(1400);
}

async function shots(label, url) {
  const out = path.join(root, 'qa', label);
  await mkdir(out, { recursive: true });
  const browser = await launch();
  const sections = [
    ['hero', null],
    ['quem-conduz', '#quem-conduz'],
    ['fechamento', '.closing'],
  ];
  for (const [vp, view] of Object.entries(viewports)) {
    const page = await browser.newPage();
    await page.setViewport(view);
    await page.goto(url, { waitUntil: 'networkidle0' });
    await wait(2200);
    for (const [name, sel] of sections) {
      if (sel) await scrollToSelector(page, sel, -40);
      if (sel) {
        // Recorta a área da seção como o visitante a vê, sem cabeçalho fixo por cima.
        await page.addStyleTag({ content: '.site-header,.skip-link{visibility:hidden!important}' });
        await wait(1200);
        // Fatias da altura da tela, rolando de verdade, costuradas depois.
        const { top, height, vh, max } = await page.evaluate((s) => {
          const r = document.querySelector(s).getBoundingClientRect();
          return { top: Math.round(r.top + scrollY), height: Math.floor(r.height), vh: innerHeight, max: document.documentElement.scrollHeight - innerHeight };
        }, sel);
        const parts = [];
        for (let y = top; y < top + height - 1; y += vh) {
          const sy = Math.min(y, max);
          await page.evaluate((v) => scrollTo(0, v), sy);
          await wait(900);
          const h = Math.floor(Math.min(vh, top + height - y));
          const shot = await page.screenshot();
          const sc = view.deviceScaleFactor || 1;
          const sharpMod = (await import('sharp')).default;
          const buf = await sharpMod(shot).extract({ left: 0, top: Math.round((y - sy) * sc), width: view.width * sc, height: Math.round(h * sc) }).toBuffer();
          parts.push({ buf, h });
        }
        const sharp = (await import('sharp')).default;
        const scale = view.deviceScaleFactor || 1;
        let offset = 0;
        const layers = parts.map(({ buf, h }) => { const l = { input: buf, top: Math.round(offset * scale), left: 0 }; offset += h; return l; });
        await sharp({ create: { width: view.width * scale, height: Math.ceil(offset * scale) + 2, channels: 3, background: '#04081a' } })
          .composite(layers).png().toFile(path.join(out, `${vp}-${name}.png`));
        await page.addStyleTag({ content: '.site-header{visibility:visible!important}' });
      } else {
        await page.screenshot({ path: path.join(out, `${vp}-${name}.png`) });
      }
    }
    await page.close();
  }
  await browser.close();
  console.log('capturas em', out);
}

async function perf(url) {
  const browser = await launch();
  const results = [];
  for (const vp of ['desktop', 'mobile']) {
    const page = await browser.newPage();
    await page.setViewport(viewports[vp]);
    await page.goto(url, { waitUntil: 'networkidle0' });
    await wait(2000);
    for (const [mode, step, dir] of [['lenta', 6, 1], ['rápida', 90, 1], ['reversa', 40, -1]]) {
      const r = await page.evaluate(async (stepPx, direction) => {
        const H = document.documentElement.scrollHeight - innerHeight;
        if (direction < 0) scrollTo(0, H); else scrollTo(0, 0);
        await new Promise((res) => setTimeout(res, 400));
        const deltas = [];
        let last = performance.now();
        let done = false;
        let longTasks = 0;
        const po = new PerformanceObserver((l) => { longTasks += l.getEntries().length; });
        try { po.observe({ type: 'longtask', buffered: false }); } catch {}
        while (!done) {
          scrollBy(0, stepPx * direction);
          await new Promise((res) => requestAnimationFrame(res));
          const now = performance.now();
          deltas.push(now - last);
          last = now;
          done = direction > 0 ? scrollY >= H - 1 : scrollY <= 0;
        }
        po.disconnect();
        deltas.shift();
        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const sorted = [...deltas].sort((a, b) => a - b);
        return {
          frames: deltas.length,
          fps: +(1000 / avg).toFixed(1),
          p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
          over33: deltas.filter((d) => d > 33.4).length,
          longTasks,
        };
      }, step, dir);
      results.push({ vp, mode, ...r });
    }
    await page.close();
  }
  await browser.close();
  console.table(results);
}

async function record(url) {
  const browser = await launch();
  for (const vp of ['desktop', 'mobile']) {
    const context = await browser.createBrowserContext(); // cache e sessão vazios
    const page = await context.newPage();
    await page.setViewport(viewports[vp]);
    const frames = path.join(root, 'qa', `_frames-${vp}`);
    await rm(frames, { recursive: true, force: true });
    await mkdir(frames, { recursive: true });
    const client = await page.createCDPSession();
    const fsp = await import('node:fs/promises');
    let t0 = null; const shots = []; const writes = [];
    client.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      if (t0 === null) t0 = metadata.timestamp;
      const file = path.join(frames, `f${String(shots.length).padStart(4, '0')}.jpg`);
      shots.push({ file, t: metadata.timestamp - t0 });
      writes.push(fsp.writeFile(file, Buffer.from(data, 'base64')));
      client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await client.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await wait(3200);
    await client.send('Page.stopScreencast');
    await wait(300);
    await Promise.all(writes);
    // Monta um vídeo com a duração real de cada quadro (concat com duration).
    const list = shots.map(({ file, t }, i) => {
      const d = i < shots.length - 1 ? shots[i + 1].t - t : 0.04;
      return `file '${file.replace(/\\/g, '/')}'\nduration ${Math.max(d, 0.001).toFixed(4)}`;
    }).join('\n');
    await fsp.writeFile(path.join(frames, 'list.txt'), list);
    const times = shots.map((s) => s.t); const n = shots.length;
    const outFile = path.join(root, 'qa', `abertura-${vp}.mp4`);
    execFileSync(ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
      '-i', path.join(frames, 'list.txt'), '-vf', 'fps=60,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
      '-c:v', 'libx264', '-crf', '20', outFile]);
    console.log(vp, `${n} quadros capturados em ${times.at(-1)?.toFixed(2)} s →`, outFile);
    await rm(frames, { recursive: true, force: true });
    await context.close();
  }
  await browser.close();
}

async function checks(url) {
  const browser = await launch();
  const report = {};
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewports.desktop);
  const state = () => page.evaluate(() => ({
    opening: document.documentElement.classList.contains('opening'),
    played: document.documentElement.dataset.opening || '',
    scrollY: Math.round(scrollY),
    clip: document.querySelector('[data-film]')?.style.clipPath.slice(0, 12) || '',
  }));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await wait(150); report.primeira_visita_150ms = await state();
  await wait(2000); report.primeira_visita_fim = await state();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await wait(150); report.retorno_mesma_sessao = await state();
  const p2 = await (await browser.createBrowserContext()).newPage();
  await p2.setViewport(viewports.desktop);
  await p2.goto(`${url}#caminhos`, { waitUntil: 'networkidle0' });
  await wait(800);
  report.link_ancora = await p2.evaluate(() => ({
    opening: document.documentElement.classList.contains('opening'),
    alvoNoTopo: Math.round(document.getElementById('caminhos').getBoundingClientRect().top),
  }));
  const p3 = await (await browser.createBrowserContext()).newPage();
  await p3.setViewport(viewports.mobile);
  await p3.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p3.goto(url, { waitUntil: 'networkidle0' });
  await wait(300);
  report.movimento_reduzido = await p3.evaluate(() => ({
    motionClass: document.documentElement.classList.contains('motion'),
    opening: document.documentElement.classList.contains('opening'),
    tituloVisivel: getComputedStyle(document.querySelector('.intro__title .line > span')).transform === 'none',
    escondidos: [...document.querySelectorAll('[data-reveal], .reveal-words .w > span')]
      .filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length,
    videoTocando: !document.querySelector('video').paused,
  }));
  await p3.screenshot({ path: path.join(root, 'qa', 'movimento-reduzido-mobile.png') });
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

const url = arg2 || arg1?.startsWith('http') ? (arg2 || arg1) : 'http://localhost:5173/';
if (cmd === 'shots') await shots(arg1 && !arg1.startsWith('http') ? arg1 : 'antes', url);
else if (cmd === 'perf') await perf(url);
else if (cmd === 'record') await record(url);
else if (cmd === 'checks') await checks(url);
