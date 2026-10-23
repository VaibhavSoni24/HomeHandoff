const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function renderBrandIcon(size) {
  const width = size;
  const height = size;
  // RGBA buffer
  const pixels = Buffer.alloc(width * height * 4);

  const bgR = 2, bgG = 132, bgB = 199; // #0284c7 (teal/sky blue)
  const houseR = 3, houseG = 105, houseB = 161; // #0369a1
  const whiteR = 255, whiteG = 255, whiteB = 255;

  const cornerRadius = size * 0.22;

  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (y * width + x) * 4;
    // Simple alpha blending
    if (a === 255) {
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    } else {
      const alpha = a / 255;
      pixels[idx] = Math.round(r * alpha + pixels[idx] * (1 - alpha));
      pixels[idx + 1] = Math.round(g * alpha + pixels[idx + 1] * (1 - alpha));
      pixels[idx + 2] = Math.round(b * alpha + pixels[idx + 2] * (1 - alpha));
      pixels[idx + 3] = 255;
    }
  }

  // Draw rounded rect background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Check rounded corners
      let inBounds = true;
      let dx = 0, dy = 0;
      if (x < cornerRadius) dx = cornerRadius - x;
      else if (x > width - cornerRadius) dx = x - (width - cornerRadius);
      if (y < cornerRadius) dy = cornerRadius - y;
      else if (y > height - cornerRadius) dy = y - (height - cornerRadius);

      if (dx > 0 && dy > 0) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cornerRadius) {
          inBounds = false;
        }
      }

      if (inBounds) {
        setPixel(x, y, bgR, bgG, bgB, 255);
      }
    }
  }

  // Scale coordinates (normalized 0..100)
  function pt(nx, ny) {
    return [Math.round((nx / 100) * width), Math.round((ny / 100) * height)];
  }

  // Draw house polygon (roof peak (50, 18), left roof (20, 44), right roof (80, 44), bottom-left (22, 78), bottom-right (78, 78))
  for (let y = 0; y < height; y++) {
    const ny = (y / height) * 100;
    for (let x = 0; x < width; x++) {
      const nx = (x / width) * 100;
      let inHouse = false;
      // Roof triangle
      if (ny >= 19 && ny <= 44) {
        const halfWidth = ((ny - 19) / 25) * 30;
        if (nx >= 50 - halfWidth && nx <= 50 + halfWidth) {
          inHouse = true;
        }
      }
      // House base
      else if (ny > 44 && ny <= 80) {
        if (nx >= 23 && nx <= 77) {
          inHouse = true;
        }
      }

      if (inHouse) {
        setPixel(x, y, houseR, houseG, houseB, 255);
      }
    }
  }

  // Function to draw antialiased thick line segment
  function drawLine(x0, y0, x1, y1, thick, r, g, b) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3;
    const rad = thick / 2;
    for (let s = 0; s <= steps; s++) {
      const cx = x0 + ((x1 - x0) * s) / steps;
      const cy = y0 + ((y1 - y0) * s) / steps;
      const minX = Math.floor(cx - rad);
      const maxX = Math.ceil(cx + rad);
      const minY = Math.floor(cy - rad);
      const maxY = Math.ceil(cy + rad);
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const d = Math.hypot(px - cx, py - cy);
          if (d <= rad) {
            setPixel(px, py, r, g, b, 255);
          }
        }
      }
    }
  }

  // Draw white house outline
  const roofThickness = Math.max(2, size * 0.04);
  const [pRoof, pLRoof, pRRoof] = [pt(50, 19), pt(20, 44), pt(80, 44)];
  const [pBL, pBR] = [pt(23, 80), pt(77, 80)];

  drawLine(pRoof[0], pRoof[1], pLRoof[0], pLRoof[1], roofThickness, whiteR, whiteG, whiteB);
  drawLine(pRoof[0], pRoof[1], pRRoof[0], pRRoof[1], roofThickness, whiteR, whiteG, whiteB);
  drawLine(pLRoof[0], pLRoof[1], pBL[0], pBL[1], roofThickness, whiteR, whiteG, whiteB);
  drawLine(pRRoof[0], pRRoof[1], pBR[0], pBR[1], roofThickness, whiteR, whiteG, whiteB);
  drawLine(pBL[0], pBL[1], pBR[0], pBR[1], roofThickness, whiteR, whiteG, whiteB);

  // Draw white checkmark
  const checkThick = Math.max(3, size * 0.065);
  const [chkA, chkB, chkC] = [pt(35, 54), pt(46, 65), pt(65, 45)];
  drawLine(chkA[0], chkA[1], chkB[0], chkB[1], checkThick, whiteR, whiteG, whiteB);
  drawLine(chkB[0], chkB[1], chkC[0], chkC[1], checkThick, whiteR, whiteG, whiteB);

  // Pack into PNG scanlines
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let scanIdx = 0;
  for (let y = 0; y < height; y++) {
    scanlines[scanIdx++] = 0; // Filter type 0
    const rowStart = y * width * 4;
    pixels.copy(scanlines, scanIdx, rowStart, rowStart + width * 4);
    scanIdx += width * 4;
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(__dirname, '..', 'public');
const sizes = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 }
];

sizes.forEach(({ file, size }) => {
  const buf = renderBrandIcon(size);
  fs.writeFileSync(path.join(publicDir, file), buf);
  console.log(`Generated ${file} (${size}x${size}, ${buf.length} bytes)`);
});
