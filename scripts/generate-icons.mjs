import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT_DIR = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(OUT_DIR, { recursive: true });

const svg = (padding) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <g transform="translate(${padding},${padding})">
    <path d="M256 60c-80 0-140 62-140 148 0 104 140 244 140 244s140-140 140-244c0-86-60-148-140-148z"
          fill="none" stroke="#22c55e" stroke-width="22" transform="scale(${(512 - 2 * padding) / 512})"/>
  </g>
  <circle cx="256" cy="220" r="64" fill="#22c55e"/>
  <path d="M180 240 h152 l14 34 h-180 z" fill="#e2e8f0"/>
  <rect x="176" y="272" width="160" height="30" rx="10" fill="#e2e8f0"/>
  <circle cx="206" cy="304" r="14" fill="#0f172a"/>
  <circle cx="306" cy="304" r="14" fill="#0f172a"/>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

for (const size of sizes) {
  await sharp(Buffer.from(svg(60)))
    .resize(size, size)
    .png()
    .toFile(`${OUT_DIR}icon-${size}.png`);
}

// Maskable icon: safe-zone padding so OS masks don't clip content.
await sharp(Buffer.from(svg(110)))
  .resize(512, 512)
  .png()
  .toFile(`${OUT_DIR}icon-maskable-512.png`);

await sharp(Buffer.from(svg(60)))
  .resize(180, 180)
  .png()
  .toFile(fileURLToPath(new URL('../public/apple-touch-icon.png', import.meta.url)));

console.log('Icons generated.');
