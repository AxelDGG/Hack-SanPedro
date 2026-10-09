// Genera los PNG de la PWA a partir del logo SVG: node scripts/generate-icons.mjs
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const svg = await readFile(new URL("../src/app/icon.svg", import.meta.url));
const outDir = fileURLToPath(new URL("../public/icons/", import.meta.url));
await mkdir(outDir, { recursive: true });

const write = (input, size, name) => sharp(input).resize(size, size).png().toFile(`${outDir}/${name}`);

await write(svg, 192, "icon-192.png");
await write(svg, 512, "icon-512.png");
await write(svg, 180, "apple-touch-icon.png");

// Maskable: fondo a sangre y el pin dentro de la zona segura (80 %).
const maskable = Buffer.from(
  svg
    .toString()
    .replace('rx="112"', 'rx="0"')
    .replace("<path", '<g transform="translate(51.2 51.2) scale(0.8)"><path')
    .replace("</svg>", "</g></svg>"),
);
await write(maskable, 512, "icon-maskable-512.png");

console.log("Íconos generados en public/icons/");
