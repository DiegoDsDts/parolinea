import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputDir = resolve('public/icons');

const colors = {
  background: [247, 245, 239, 255],
  green: [47, 143, 91, 255],
  greenDark: [30, 111, 69, 255],
  tile: [255, 253, 248, 255],
};

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(filePath, width, height, rgba) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * (width * 4 + 1);
    raw[rawOffset] = 0;
    rgba.copy(raw, rawOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    Buffer.concat([header, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]),
  );
}

function createCanvas(size) {
  const rgba = Buffer.alloc(size * size * 4);
  fillRect(rgba, size, 0, 0, size, size, colors.background);
  return rgba;
}

function setPixel(rgba, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const offset = (y * size + x) * 4;
  rgba[offset] = color[0];
  rgba[offset + 1] = color[1];
  rgba[offset + 2] = color[2];
  rgba[offset + 3] = color[3];
}

function fillRect(rgba, size, x, y, width, height, color) {
  const minX = Math.max(0, Math.round(x));
  const minY = Math.max(0, Math.round(y));
  const maxX = Math.min(size, Math.round(x + width));
  const maxY = Math.min(size, Math.round(y + height));
  for (let row = minY; row < maxY; row += 1) {
    for (let col = minX; col < maxX; col += 1) setPixel(rgba, size, col, row, color);
  }
}

function fillRoundRect(rgba, size, x, y, width, height, radius, color) {
  const minX = Math.round(x);
  const minY = Math.round(y);
  const maxX = Math.round(x + width);
  const maxY = Math.round(y + height);
  const r = Math.round(radius);

  for (let row = minY; row < maxY; row += 1) {
    for (let col = minX; col < maxX; col += 1) {
      const dx = col < x + r ? x + r - col : col >= x + width - r ? col - (x + width - r - 1) : 0;
      const dy = row < y + r ? y + r - row : row >= y + height - r ? row - (y + height - r - 1) : 0;
      if (dx * dx + dy * dy <= r * r) setPixel(rgba, size, col, row, color);
    }
  }
}

function strokeLine(rgba, size, x1, y1, x2, y2, width, color) {
  const half = width / 2;
  const minX = Math.floor(Math.min(x1, x2) - half);
  const maxX = Math.ceil(Math.max(x1, x2) + half);
  const minY = Math.floor(Math.min(y1, y2) - half);
  const maxY = Math.ceil(Math.max(y1, y2) + half);
  const lengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lengthSquared));
      const px = x1 + t * (x2 - x1);
      const py = y1 + t * (y2 - y1);
      if ((x - px) ** 2 + (y - py) ** 2 <= half ** 2) setPixel(rgba, size, x, y, color);
    }
  }
}

function drawIcon(size, maskable = false) {
  const rgba = createCanvas(size);
  const scale = size / 512;
  const outer = maskable ? 92 * scale : 70 * scale;
  const boardSize = size - outer * 2;

  fillRoundRect(rgba, size, outer, outer, boardSize, boardSize, 76 * scale, colors.green);

  const tileSize = 76 * scale;
  const gap = 22 * scale;
  const start = outer + 50 * scale;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      fillRoundRect(
        rgba,
        size,
        start + col * (tileSize + gap),
        start + row * (tileSize + gap),
        tileSize,
        tileSize,
        18 * scale,
        colors.tile,
      );
    }
  }

  const lineWidth = Math.max(7, 18 * scale);
  const center = (row, col) => [
    start + col * (tileSize + gap) + tileSize / 2,
    start + row * (tileSize + gap) + tileSize / 2,
  ];
  const points = [center(0, 0), center(0, 1), center(1, 1), center(1, 2), center(2, 2), center(2, 1)];
  for (let i = 0; i < points.length - 1; i += 1) {
    strokeLine(rgba, size, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], lineWidth, colors.greenDark);
  }

  return rgba;
}

const outputs = [
  ['icon-192.png', 192, false],
  ['icon-maskable-192.png', 192, true],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
];

for (const [name, size, maskable] of outputs) {
  writePng(resolve(outputDir, name), size, size, drawIcon(size, maskable));
}
