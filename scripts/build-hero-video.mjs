// Monta o loop do hero a partir do Reel Hub Experience (vídeo de @sampaio.filmes).
// O arquivo do Instagram é um filme horizontal 2,35:1 gravado de lado em 1080x1920,
// por isso cada trecho é girado (transpose=2) e tem as tarjas cortadas.
// Rode com: npm run hero-video
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const input = path.join(root, '_raw-media', 'reel', 'hub-experience-1080.mp4');
const out = (f) => path.join(root, 'public', 'media', f);
const run = (args) => execFileSync(ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

// Planos escolhidos (início, fim), nos cortes detectados do filme.
// O terceiro valor é o centro horizontal do recorte vertical (celular), em px do quadro 1920.
const shots = [
  [64.42, 66.16, 960], //  palco com HUB EXPERIENCE no telão (pôster)
  [47.34, 48.99, 1060], // palestrante no corredor, plateia
  [12.84, 14.24, 1180], // palestrante com microfone
  [57.59, 58.45, 1010], // os sócios diante do painel da marca
  [59.34, 61.03, 960], //  salão inteiro diante do telão (fecha o loop: claro o bastante para o "H" em repouso)
];

const upright = 'transpose=2,crop=1920:820:0:130';
const chain = (extra) => {
  const parts = shots.map(([a, b, cx], i) =>
    `[0:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS,${upright},${extra(cx)}[s${i}]`);
  const labels = shots.map((_, i) => `[s${i}]`).join('');
  return `${parts.join(';')};${labels}concat=n=${shots.length}:v=1:a=0,fps=24,format=yuv420p[v]`;
};

const variants = [
  // Desktop: quadro horizontal inteiro.
  { name: 'hero-wide', filter: () => 'scale=1600:684:flags=lanczos', crf264: 25, crfVp9: 34 },
  // Celular: recorte vertical central, onde está a ação de cada plano.
  { name: 'hero-tall', filter: (cx) => `crop=462:820:${Math.round(cx - 231)}:0,scale=480:852:flags=lanczos`, crf264: 26, crfVp9: 35 },
];

for (const v of variants) {
  const graph = chain(v.filter);
  run(['-i', input, '-filter_complex', graph, '-map', '[v]', '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(v.crf264), '-profile:v', 'high',
    '-movflags', '+faststart', out(`${v.name}.mp4`)]);
  run(['-i', input, '-filter_complex', graph, '-map', '[v]', '-an',
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(v.crfVp9), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
    out(`${v.name}.webm`)]);
  // Pôster = primeiro quadro do loop, para a troca pôster → vídeo não ter salto.
  run(['-ss', String(shots[0][0] + 0.04), '-i', input, '-frames:v', '1',
    '-vf', `${upright},${v.filter(shots[0][2])}`, '-q:v', '3', out(`${v.name}-poster.jpg`)]);
}
// Fotos do filme usadas ao longo do site (quadro inteiro 1920x820, sem ampliação).
const stills = {
  'film-iphones': 24.9, //  vitrine de iPhones
  'film-room': 60.2, //     salão diante do telão
  'film-partners': 58.0, // sócios diante do painel da marca
};
const sharp = (await import('sharp')).default;
for (const [name, t] of Object.entries(stills)) {
  const png = path.join(root, '_raw-media', 'reel', `${name}.png`);
  run(['-ss', String(t), '-i', input, '-frames:v', '1', '-vf', upright, png]);
  for (const w of [960, 1600]) {
    await sharp(png).resize(w).webp({ quality: 78, effort: 6 }).toFile(out(`${name}-${w}.webp`));
  }
}
console.log('Vídeos e fotos do hero gerados em public/media');
