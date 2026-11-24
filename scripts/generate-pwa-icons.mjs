import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const outputDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const background = [36, 59, 83];
const backgroundHex = '#243b53';
const foreground = [255, 255, 255];
const ringRadiusRatio = 0.25;
const ringStrokeRatio = 0.07;
const crcTable = new Uint32Array(256);

for (let value = 0; value < crcTable.length; value += 1) {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  crcTable[value] = crc >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function renderIcon(size) {
  const rowLength = 1 + size * 4;
  const pixels = Buffer.alloc(rowLength * size);
  const center = (size - 1) / 2;
  const ringRadius = size * ringRadiusRatio;
  const ringHalfWidth = size * ringStrokeRatio / 2;
  const samples = 4;

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * rowLength;
    pixels[rowStart] = 0; // PNG filter: None

    for (let x = 0; x < size; x += 1) {
      let ringCoverage = 0;
      for (let sampleY = 0; sampleY < samples; sampleY += 1) {
        for (let sampleX = 0; sampleX < samples; sampleX += 1) {
          const dx = x + (sampleX + 0.5) / samples - center;
          const dy = y + (sampleY + 0.5) / samples - center;
          const distance = Math.hypot(dx, dy);
          if (Math.abs(distance - ringRadius) <= ringHalfWidth) ringCoverage += 1;
        }
      }

      const blend = ringCoverage / (samples * samples);
      const offset = rowStart + 1 + x * 4;
      pixels[offset] = Math.round(background[0] * (1 - blend) + foreground[0] * blend);
      pixels[offset + 1] = Math.round(background[1] * (1 - blend) + foreground[1] * blend);
      pixels[offset + 2] = Math.round(background[2] * (1 - blend) + foreground[2] * blend);
      pixels[offset + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA color type

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function renderSvg(size) {
  const center = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * 0.25}" fill="${backgroundHex}"/><circle cx="${center}" cy="${center}" r="${size * ringRadiusRatio}" fill="none" stroke="#fff" stroke-width="${size * ringStrokeRatio}"/></svg>\n`;
}

for (const size of [192, 512]) {
  await writeFile(`${outputDirectory}pwa-${size}.svg`, renderSvg(size));
  await writeFile(`${outputDirectory}pwa-${size}.png`, renderIcon(size));
}
