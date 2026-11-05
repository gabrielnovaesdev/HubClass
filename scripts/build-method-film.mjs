// Monta o filme do Método a partir dos dois Reels do Hub Experience (vídeos de @sampaio.filmes):
//   dia 1 → _raw-media/reel/hub-experience-1080.mp4 (o mesmo do hero)
//   dia 2 → _raw-media/reel/hub-experience-dia2-1080.mp4
// Os arquivos do Instagram são filmes 2,35:1 gravados de lado em 1080x1920: cada trecho é girado
// (transpose=2) e tem as tarjas cortadas, como no hero. Nenhum plano repete os do hero.
// Rode com: npm run method-film
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const inputs = [
  path.join(root, '_raw-media', 'reel', 'hub-experience-dia2-1080.mp4'), // 0: dia 2
  path.join(root, '_raw-media', 'reel', 'hub-experience-1080.mp4'), //      1: dia 1
];
const out = (f) => path.join(root, 'public', 'media', f);
const run = (args) => execFileSync(ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

// [fonte, início, fim, centro do recorte vertical em px do quadro 1920]. Cortes nos limites dos planos.
const chapters = [
  { name: 'Abertura', shots: [
    [0, 66.95, 68.29, 960], //   salão lotado: o quadro parado da faixa é o 1º quadro daqui
  ] },
  { name: 'Marketing', shots: [
    [0, 31.30, 33.21, 1110], //  telão "com marca forte"
    [0, 33.29, 34.17, 1100], //  palestrante no palco
    [0, 63.00, 64.58, 900], //   mentor no painel com os perfis
  ] },
  { name: 'Vendas', shots: [
    [0, 23.54, 25.42, 330], //   estande: "plataforma para venda de celulares"
    [1, 62.79, 63.50, 860], //   painel "venda uma vez e receba todo mês"
    [0, 4.00, 4.92, 1250], //    produto passando de mão em mão
    [0, 5.96, 7.25, 900], //     vitrine de acessórios
  ] },
  { name: 'Gestão', shots: [
    [1, 37.50, 38.71, 1150], //  slide "resultado comprovado"
    [0, 39.16, 41.00, 300], //   estande "mercado mobile e tributação"
    [0, 72.21, 73.17, 260], //   palestra: "sua empresa está parada no tempo?"
  ] },
];

const shots = chapters.flatMap((c) => c.shots);
const upright = 'transpose=2,crop=1920:820:0:130';
const chain = (extra) => {
  const parts = shots.map(([src, a, b, cx], i) =>
    `[${src}:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS,${upright},${extra(cx)},setsar=1[s${i}]`);
  return `${parts.join(';')};${shots.map((_, i) => `[s${i}]`).join('')}concat=n=${shots.length}:v=1:a=0,fps=24,format=yuv420p[v]`;
};

const variants = [
  { name: 'method-wide', filter: () => 'scale=1600:684:flags=lanczos', crf264: 25, crfVp9: 34 },
  { name: 'method-tall', filter: (cx) => `crop=462:820:${Math.min(1920 - 462, Math.max(0, Math.round(cx - 231)))}:0,scale=480:852:flags=lanczos`, crf264: 26, crfVp9: 35 },
];
const inArgs = inputs.flatMap((f) => ['-i', f]);

for (const v of variants) {
  const graph = chain(v.filter);
  run([...inArgs, '-filter_complex', graph, '-map', '[v]', '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(v.crf264), '-profile:v', 'high', '-g', '24',
    '-movflags', '+faststart', out(`${v.name}.mp4`)]);
  run([...inArgs, '-filter_complex', graph, '-map', '[v]', '-an',
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(v.crfVp9), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-g', '24',
    out(`${v.name}.webm`)]);
  // Pôster = primeiro quadro do filme, para a foto parada "ganhar vida" sem salto.
  const [src, a, , cx] = shots[0];
  run(['-ss', String(a + 0.04), '-i', inputs[src], '-frames:v', '1', '-vf', `${upright},${v.filter(cx)}`, '-q:v', '3', out(`${v.name}-poster.jpg`)]);
}

// Ambiente da faixa: a foto parada já desfocada num arquivo pequeno (sem filtro em tempo real no navegador).
const sharp = (await import('sharp')).default;
await sharp(out('method-wide-poster.jpg')).resize(320).blur(7).modulate({ saturation: 1.15 }).webp({ quality: 70 }).toFile(out('method-ambient.webp'));

// Marcas de capítulo (segundos no filme montado), para o index.html.
let t = 0;
const marks = chapters.map((c) => { const start = t; t += c.shots.reduce((s, [, a, b]) => s + (b - a), 0); return `${c.name} ${start.toFixed(2)}–${t.toFixed(2)}s`; });
console.log('Capítulos:', marks.join(' | '));
console.log('Filme do Método gerado em public/media');
