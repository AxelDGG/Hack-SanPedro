// Genera ilustraciones originales (SVG) para las fotos de los datos demo:
// node scripts/generate-placeholders.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const outDir = fileURLToPath(new URL("../public/placeholders/", import.meta.url));
await mkdir(outDir, { recursive: true });

const FONDOS = ["#f3e7d3", "#e3efe9", "#f6dfd6", "#e4e6f3", "#f4ecc9", "#e9e1f2"];

// [pelaje, orejas/manchas, hocico]
const PERROS = [
  ["#c98b4f", "#8a5a2e", "#f1d9b8"],
  ["#2f2a26", "#1a1714", "#8c7a68"],
  ["#e8d3a8", "#c9a66b", "#fff4df"],
  ["#9a6b47", "#5c3d26", "#e8c9a6"],
  ["#f5efe6", "#c4a580", "#ffffff"],
  ["#7d7f86", "#4b4d53", "#c9cbd1"],
  ["#b5562f", "#7c3517", "#e6b48f"],
  ["#d9b98c", "#2f2a26", "#f5e6cc"],
];
const GATOS = [
  ["#f0a35e", "#c46e2a", "#ffe2c2"],
  ["#2b2724", "#141210", "#6a625b"],
  ["#c7c3bd", "#7f7a74", "#f1eeea"],
  ["#f7f1e8", "#d9a46a", "#ffffff"],
  ["#8a6a4e", "#4f3a28", "#d8c0a6"],
  ["#5f6670", "#353a41", "#b7bcc4"],
];

function perro([pelaje, oscuro, hocico], fondo, i) {
  const mancha = i % 2 === 0 ? `<ellipse cx="228" cy="128" rx="28" ry="24" fill="${oscuro}" opacity=".85"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="${fondo}"/>
  <circle cx="330" cy="60" r="90" fill="#ffffff" opacity=".35"/>
  <ellipse cx="200" cy="300" rx="120" ry="60" fill="${pelaje}"/>
  <ellipse cx="128" cy="140" rx="34" ry="62" transform="rotate(18 128 140)" fill="${oscuro}"/>
  <ellipse cx="272" cy="140" rx="34" ry="62" transform="rotate(-18 272 140)" fill="${oscuro}"/>
  <ellipse cx="200" cy="160" rx="82" ry="86" fill="${pelaje}"/>
  ${mancha}
  <ellipse cx="200" cy="200" rx="46" ry="36" fill="${hocico}"/>
  <ellipse cx="200" cy="184" rx="15" ry="11" fill="#2b2118"/>
  <path d="M200 195v12M186 212q14 10 28 0" stroke="#2b2118" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="170" cy="146" r="9" fill="#2b2118"/><circle cx="230" cy="146" r="9" fill="#2b2118"/>
  <circle cx="173" cy="143" r="3" fill="#fff"/><circle cx="233" cy="143" r="3" fill="#fff"/>
</svg>`;
}

function gato([pelaje, oscuro, hocico], fondo, i) {
  const rayas =
    i % 2 === 0
      ? `<path d="M200 80v24M178 84l6 20M222 84l-6 20" stroke="${oscuro}" stroke-width="7" stroke-linecap="round"/>`
      : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="${fondo}"/>
  <circle cx="70" cy="60" r="80" fill="#ffffff" opacity=".35"/>
  <ellipse cx="200" cy="300" rx="110" ry="58" fill="${pelaje}"/>
  <path d="M128 120 L140 40 L188 92 Z" fill="${pelaje}"/><path d="M272 120 L260 40 L212 92 Z" fill="${pelaje}"/>
  <path d="M138 104 L146 60 L172 90 Z" fill="${hocico}"/><path d="M262 104 L254 60 L228 90 Z" fill="${hocico}"/>
  <ellipse cx="200" cy="160" rx="84" ry="78" fill="${pelaje}"/>
  ${rayas}
  <ellipse cx="200" cy="196" rx="34" ry="24" fill="${hocico}"/>
  <path d="M190 184h20l-10 11z" fill="#d9746a"/>
  <path d="M200 195q-8 10-16 4M200 195q8 10 16 4" stroke="#2b2118" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M150 190h-44M150 200l-42 8M250 190h44M250 200l42 8" stroke="#2b2118" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>
  <ellipse cx="170" cy="150" rx="11" ry="14" fill="#7aa95c"/><ellipse cx="230" cy="150" rx="11" ry="14" fill="#7aa95c"/>
  <ellipse cx="170" cy="150" rx="4" ry="11" fill="#2b2118"/><ellipse cx="230" cy="150" rx="4" ry="11" fill="#2b2118"/>
</svg>`;
}

function otro(fondo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="${fondo}"/>
  <g fill="#e2583e" opacity=".8" transform="translate(200 160)">
    <path d="M0 0c-26 0-50 22-50 42 0 15 12 22 25 20 9-1 16-5 25-5s16 4 25 5c13 2 25-5 25-20 0-20-24-42-50-42z"/>
    <ellipse cx="-49" cy="-28" rx="15" ry="20" transform="rotate(-22 -49 -28)"/>
    <ellipse cx="-18" cy="-54" rx="15" ry="21" transform="rotate(-7 -18 -54)"/>
    <ellipse cx="18" cy="-54" rx="15" ry="21" transform="rotate(7 18 -54)"/>
    <ellipse cx="49" cy="-28" rx="15" ry="20" transform="rotate(22 49 -28)"/>
  </g>
</svg>`;
}

let n = 0;
for (const [i, colores] of PERROS.entries()) {
  await writeFile(`${outDir}/perro-${i + 1}.svg`, perro(colores, FONDOS[i % FONDOS.length], i));
  n++;
}
for (const [i, colores] of GATOS.entries()) {
  await writeFile(`${outDir}/gato-${i + 1}.svg`, gato(colores, FONDOS[(i + 2) % FONDOS.length], i));
  n++;
}
for (let i = 0; i < 2; i++) {
  await writeFile(`${outDir}/otro-${i + 1}.svg`, otro(FONDOS[(i + 4) % FONDOS.length]));
  n++;
}
console.log(`${n} ilustraciones en public/placeholders/`);
