// Media fixtures made in code, so tests and stories need no downloaded assets: WAV tones from PCM samples, a peaks
// array, a small hand-written PDF (with correct cross-reference offsets), a canvas poster and a recorded WebM clip.

/** A mono 16-bit PCM WAV of a sine tone, fading in and out so it doesn't click. */
export function toneWav({
  seconds = 2,
  frequency = 440,
  sampleRate = 8000,
  amplitude = 0.5,
}: { seconds?: number; frequency?: number; sampleRate?: number; amplitude?: number } = {}): Blob {
  const count = Math.round(seconds * sampleRate);
  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + count * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, count * 2, true);
  const fade = Math.min(count / 4, sampleRate * 0.05);
  for (let index = 0; index < count; index += 1) {
    const envelope = Math.min(1, index / fade, (count - index) / fade);
    const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * amplitude * envelope;
    view.setInt16(44 + index * 2, Math.round(sample * 32767), true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** A blob URL of `toneWav(options)`. */
export function toneUrl(options?: Parameters<typeof toneWav>[0]): string {
  return URL.createObjectURL(toneWav(options));
}

/** Deterministic peaks (0–1) shaped like speech: phrases with pauses. */
export const samplePeaks: number[] = Array.from({ length: 480 }, (_, index) => {
  const phrase = Math.sin((index / 480) * Math.PI * 7) ** 2;
  const syllables = 0.55 + 0.45 * Math.abs(Math.sin(index * 0.9) * Math.cos(index * 0.37));
  const pause = index % 96 > 84 ? 0.05 : 1;
  return Math.round(Math.max(0.03, phrase * syllables * pause) * 1000) / 1000;
});

/** Chapters of a two-minute talk, in seconds. */
export const sampleChapters = [
  { at: 0, label: 'Introduction' },
  { at: 34, label: 'The inner planets' },
  { at: 71, label: 'Gas giants' },
  { at: 102, label: 'Questions' },
];

function escapePdfText(text: string): string {
  return text.replace(/[\\()]/g, (char) => `\\${char}`);
}

// The PDF standard security handler, revision 2 (RC4, 40-bit), for a password-protected fixture: MD5 and RC4 here
// are for tests only.

function md5(bytes: Uint8Array): Uint8Array {
  const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const constants = Array.from(
    { length: 64 },
    (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0,
  );
  const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (bytes.length * 8) >>> 0, true);
  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    let [a, b, c, d] = [a0, b0, c0, d0];
    for (let index = 0; index < 64; index += 1) {
      const round = index >> 4;
      const f =
        round === 0
          ? (b & c) | (~b & d)
          : round === 1
            ? (d & b) | (~d & c)
            : round === 2
              ? b ^ c ^ d
              : c ^ (b | ~d);
      const word =
        round === 0
          ? index
          : round === 1
            ? (5 * index + 1) % 16
            : round === 2
              ? (3 * index + 5) % 16
              : (7 * index) % 16;
      const sum = (f + a + (constants[index] ?? 0) + view.getUint32(chunk + word * 4, true)) >>> 0;
      const shift = shifts[round * 4 + (index % 4)] ?? 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((sum << shift) | (sum >>> (32 - shift)))) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((value, index) => {
    outView.setUint32(index * 4, value, true);
  });
  return out;
}

function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const state = Array.from({ length: 256 }, (_, index) => index);
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + (state[i] ?? 0) + (key[i % key.length] ?? 0)) & 255;
    [state[i], state[j]] = [state[j] ?? 0, state[i] ?? 0];
  }
  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let index = 0; index < data.length; index += 1) {
    i = (i + 1) & 255;
    j = (j + (state[i] ?? 0)) & 255;
    [state[i], state[j]] = [state[j] ?? 0, state[i] ?? 0];
    out[index] = (data[index] ?? 0) ^ (state[((state[i] ?? 0) + (state[j] ?? 0)) & 255] ?? 0);
  }
  return out;
}

const PASSWORD_PADDING = Uint8Array.from([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

const latin1 = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));
const fromBytes = (bytes: Uint8Array) => String.fromCharCode(...bytes);
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};
const padPassword = (password: string) => concat(latin1(password), PASSWORD_PADDING).slice(0, 32);

/** The O, U and file key of the revision 2 security handler, with all permissions. */
function securityHandler(password: string, id: Uint8Array) {
  const permissions = Uint8Array.from([0xfc, 0xff, 0xff, 0xff]); // P = -4
  const owner = rc4(md5(padPassword(`${password}-owner`)).slice(0, 5), padPassword(password));
  const key = md5(concat(padPassword(password), owner, permissions, id)).slice(0, 5);
  const user = rc4(key, PASSWORD_PADDING);
  return { owner, user, key };
}

/**
 * A valid PDF with one page per entry: each page's lines of text in Helvetica (ASCII only), or, with
 * `isScanned`, grey blocks and no text at all (like a scan without OCR). With `password`, it's encrypted with the
 * standard security handler (RC4, 40-bit) and needs that password to open. Offsets in the cross-reference table are
 * computed from the bytes, so pdf.js opens it without repairing it.
 */
export function buildPdf(
  pages: readonly (readonly string[])[],
  { isScanned = false, password }: { isScanned?: boolean; password?: string } = {},
): Uint8Array {
  const id = md5(latin1(`fixture-${String(pages.length)}`));
  const security = password === undefined ? undefined : securityHandler(password, id);
  const encrypt = (objectId: number, text: string) => {
    if (!security) {
      return text;
    }
    const objectKey = md5(
      concat(
        security.key,
        Uint8Array.from([objectId & 255, (objectId >> 8) & 255, objectId >> 16, 0, 0]),
      ),
    ).slice(0, 10);
    return fromBytes(rc4(objectKey, latin1(text)));
  };
  const objects: string[] = [];
  const pageIds: number[] = [];
  // 1: catalog, 2: pages, 3: font, then a page and its content stream for each page.
  pages.forEach((lines, index) => {
    const pageId = 4 + index * 2;
    pageIds.push(pageId);
    const content = encrypt(
      pageId + 1,
      isScanned
        ? `0.85 g 72 ${String(600 - index * 10)} 468 120 re f 0.7 g 72 420 300 60 re f`
        : [
            'BT /F1 20 Tf 72 720 Td',
            ...lines.map((line, lineIndex) =>
              lineIndex === 0
                ? `(${escapePdfText(line)}) Tj /F1 12 Tf`
                : `0 -22 Td (${escapePdfText(line)}) Tj`,
            ),
            'ET',
          ].join('\n'),
    );
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${String(pageId + 1)} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${String(content.length)} >>\nstream\n${content}\nendstream`;
  });
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((pageId) => `${String(pageId)} 0 R`).join(' ')}] /Count ${String(pages.length)} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  let encryptId: number | undefined;
  if (security) {
    encryptId = objects.length;
    objects[encryptId] =
      `<< /Filter /Standard /V 1 /R 2 /O <${hex(security.owner)}> /U <${hex(security.user)}> /P -4 >>`;
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    offsets[objectId] = pdf.length;
    pdf += `${String(objectId)} 0 obj\n${objects[objectId] ?? ''}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${String(objects.length)}\n0000000000 65535 f \n`;
  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    pdf += `${String(offsets[objectId] ?? 0).padStart(10, '0')} 00000 n \n`;
  }
  const encryption =
    encryptId === undefined
      ? ''
      : ` /Encrypt ${String(encryptId)} 0 R /ID [<${hex(id)}> <${hex(id)}>]`;
  pdf += `trailer\n<< /Size ${String(objects.length)} /Root 1 0 R${encryption} >>\nstartxref\n${String(xref)}\n%%EOF\n`;
  // Latin-1, byte for byte, so the offsets above stay true for the encrypted (binary) streams.
  return latin1(pdf);
}

/** A five-page account statement with invoice numbers to search for. */
export const statementPages: string[][] = Array.from({ length: 5 }, (_, index) => [
  `Observatory Supply Co. - Statement page ${String(index + 1)}`,
  'Account: Ada Lovelace, Analytical Engines Ltd',
  `Invoice INV-${String(1040 + index * 2).padStart(5, '0')}  Telescope mirror coating  1,250.00`,
  `Invoice INV-${String(1041 + index * 2).padStart(5, '0')}  Spectrograph calibration  480.00`,
  index === 2 ? 'Note: invoice INV-01044 was paid on 12 March.' : 'Thank you for your business.',
]);

/** A poster image: a night sky gradient with a planet, as a PNG data URL. */
export function posterDataUrl(width = 320, height = 180): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0b1d3a');
  sky.addColorStop(1, '#27426b');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#e8b46a';
  context.beginPath();
  context.arc(width * 0.68, height * 0.45, height * 0.22, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ffffff';
  for (let star = 0; star < 24; star += 1) {
    context.fillRect((star * 53) % width, (star * 29) % (height * 0.8), 1.5, 1.5);
  }
  return canvas.toDataURL('image/png');
}

/** Records `seconds` of an animated canvas to a WebM blob (MediaRecorder; Chromium). */
export async function recordWebm(seconds = 1.2, width = 160, height = 90): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => {
      resolve();
    };
  });
  recorder.start();
  const started = performance.now();
  await new Promise<void>((resolve) => {
    const frame = () => {
      const elapsed = performance.now() - started;
      if (context) {
        context.fillStyle = `hsl(${String(Math.round(elapsed / 5) % 360)} 60% 40%)`;
        context.fillRect(0, 0, width, height);
      }
      if (elapsed >= seconds * 1000) {
        resolve();
      } else {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  });
  recorder.stop();
  await stopped;
  for (const track of stream.getTracks()) {
    track.stop();
  }
  return new Blob(chunks, { type: 'video/webm' });
}

/** Resolves to `path` when it's served (for example a real file in `.storybook/public/media`), otherwise `fallback`. */
export async function assetOr(path: string, fallback: () => string): Promise<string> {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    const type = response.headers.get('content-type') ?? '';
    // Storybook's dev server answers unknown paths with its HTML page; that isn't the asset.
    if (response.ok && !type.includes('text/html')) {
      return path;
    }
  } catch {
    // Not served.
  }
  return fallback();
}
