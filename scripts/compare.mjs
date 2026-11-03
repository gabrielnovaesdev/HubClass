// Monta comparativos lado a lado (antes | depois) a partir de qa/antes e qa/depois.
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const qa = (...p) => path.join(root, 'qa', ...p);
for (const vp of ['desktop', 'mobile']) {
  for (const section of ['quem-conduz', 'fechamento']) {
    const width = vp === 'desktop' ? 900 : 420;
    const [a, b] = await Promise.all(['antes', 'depois'].map((s) => sharp(qa(s, `${vp}-${section}.png`)).resize({ width }).toBuffer()));
    const [ma, mb] = await Promise.all([a, b].map((x) => sharp(x).metadata()));
    const label = (t) => Buffer.from(`<svg width="${width}" height="48"><text x="0" y="34" font-family="Arial" font-size="26" font-weight="700" fill="#0a1230">${t}</text></svg>`);
    await sharp({ create: { width: width * 2 + 40, height: Math.max(ma.height, mb.height) + 56, channels: 3, background: '#ffffff' } })
      .composite([
        { input: label('ANTES'), left: 0, top: 0 },
        { input: label('DEPOIS'), left: width + 40, top: 0 },
        { input: a, left: 0, top: 56 },
        { input: b, left: width + 40, top: 56 },
      ])
      .png()
      .toFile(qa(`comparativo-${section}-${vp}.png`));
  }
}
console.log('comparativos em qa/');
