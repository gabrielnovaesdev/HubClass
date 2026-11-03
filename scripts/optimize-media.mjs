// Gera as mídias otimizadas em public/media a partir dos originais em _raw-media.
// Rode com: npm run media
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (f) => path.join(root, '_raw-media', f);
const out = (f) => path.join(root, 'public', 'media', f);
await mkdir(path.join(root, 'public', 'media'), { recursive: true });

const webp = { quality: 78, effort: 6 };

// Retratos dos sócios em 4:5, com equilíbrio óptico: cada recorte é calculado a partir do
// rosto medido no original (centro, altura dos olhos e largura de orelha a orelha), para
// que os três rostos tenham a mesma escala percebida e os olhos fiquem na mesma altura (32%).
// O brilho é ajustado por pessoa para aproximar os fundos, que vieram de sessões diferentes.
const portraits = [
  { file: 'alex-lemos.png', name: 'alex-lemos', faceX: 870, eyeY: 500, faceW: 410, brightness: 0.98 },
  { file: 'img-6652.jpg', name: 'juan-rodrigues', faceX: 780, eyeY: 618, faceW: 480, brightness: 0.93 },
  { file: 'img-4156.jpg', name: 'daniel-silva', faceX: 815, eyeY: 593, faceW: 293, brightness: 1.06 },
];
for (const p of portraits) {
  const { width, height } = await sharp(src(p.file)).metadata();
  const cropW = Math.round(p.faceW / 0.36);
  const cropH = Math.round(cropW * 1.25);
  const left = Math.max(0, Math.min(width - cropW, Math.round(p.faceX - cropW / 2)));
  const top = Math.max(0, Math.min(height - cropH, Math.round(p.eyeY - cropH * 0.32)));
  for (const w of [480, 800]) {
    await sharp(src(p.file))
      .extract({ left, top, width: cropW, height: cropH })
      .resize(w)
      .modulate({ brightness: p.brightness, saturation: 0.94 })
      .webp(webp)
      .toFile(out(`${p.name}-${w}.webp`));
  }
}

// Workbook (página Formação Varejo).
for (const w of [560, 900]) {
  await sharp(src('workbook.png')).resize(w).webp(webp).toFile(out(`workbook-${w}.webp`));
}

// Marca "H" extraída do logo oficial (o restante do PNG é o nome em branco).
const mark = sharp(src('logo-hubclass.png')).extract({ left: 20, top: 418, width: 142, height: 188 });
await mark.clone().resize({ height: 96 }).png().toFile(out('hubclass-mark.png'));
const navy = { r: 5, g: 10, b: 26, alpha: 1 };
for (const [size, name] of [[64, 'favicon-64.png'], [180, 'apple-touch-icon.png']]) {
  const inner = await sharp(src('logo-hubclass.png'))
    .extract({ left: 20, top: 418, width: 142, height: 188 })
    .resize({ height: Math.round(size * 0.66) })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: navy } })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(out(name));
}

console.log('Mídias geradas em public/media');
