// Images for the `/media` image components' stories and tests, drawn on a canvas in code: deterministic, nothing
// downloaded. Every function draws the same pixels every time (random-looking parts use a seeded generator).
import type { Annotation, MediaImage } from '../src/media/image';

/** A small seeded pseudo-random generator (mulberry32), so star fields are the same on every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasOf(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas is not available');
  }
  return context;
}

function drawStars(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
  count: number,
): void {
  const random = seeded(seed);
  context.fillStyle = '#05070f';
  context.fillRect(0, 0, width, height);
  // A faint band of the galaxy across the middle.
  context.fillStyle = 'rgba(120, 130, 190, 0.08)';
  context.beginPath();
  context.ellipse(width / 2, height / 2, width * 0.7, height * 0.12, -0.35, 0, Math.PI * 2);
  context.fill();
  for (let index = 0; index < count; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = 0.4 + random() ** 4 * 2.6;
    const shade = 180 + Math.floor(random() * 75);
    context.fillStyle = `rgb(${shade}, ${shade}, ${255 - Math.floor(random() * 40)})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawPlanet(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colours: readonly string[],
  hasRings: boolean,
): void {
  if (hasRings) {
    context.strokeStyle = 'rgba(225, 200, 150, 0.85)';
    context.lineWidth = radius * 0.12;
    context.beginPath();
    context.ellipse(x, y, radius * 2, radius * 0.5, -0.3, Math.PI, Math.PI * 2);
    context.stroke();
  }
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip();
  const bandHeight = (radius * 2) / colours.length;
  colours.forEach((colour, index) => {
    context.fillStyle = colour;
    context.fillRect(x - radius, y - radius + index * bandHeight, radius * 2, bandHeight + 1);
  });
  // A shadow on the night side.
  context.fillStyle = 'rgba(0, 0, 0, 0.45)';
  context.beginPath();
  context.arc(x + radius * 0.55, y + radius * 0.2, radius * 1.05, 0, Math.PI * 2);
  context.fill();
  context.restore();
  if (hasRings) {
    context.strokeStyle = 'rgba(225, 200, 150, 0.85)';
    context.lineWidth = radius * 0.12;
    context.beginPath();
    context.ellipse(x, y, radius * 2, radius * 0.5, -0.3, 0, Math.PI);
    context.stroke();
  }
}

/** A star field with a ringed planet, as a PNG data URL. */
export function starfieldImage({
  width = 1600,
  height = 1000,
  seed = 7,
}: { width?: number; height?: number; seed?: number } = {}): string {
  const context = canvasOf(width, height);
  drawStars(context, width, height, seed, Math.round((width * height) / 900));
  drawPlanet(
    context,
    width * 0.68,
    height * 0.42,
    Math.min(width, height) * 0.16,
    ['#e4c48f', '#caa36a', '#e9d3a5', '#b88d55', '#dcc08e'],
    true,
  );
  drawPlanet(
    context,
    width * 0.2,
    height * 0.75,
    Math.min(width, height) * 0.05,
    ['#9bb7d4'],
    false,
  );
  return context.canvas.toDataURL('image/png');
}

/** The planets, with their band colours (the ringed one is Saturn). */
const planets = [
  { id: 'mercury', name: 'Mercury', colours: ['#9a9590', '#857f79', '#a6a19c'] },
  { id: 'venus', name: 'Venus', colours: ['#e8cf96', '#dcbf80', '#efd9a8'] },
  { id: 'earth', name: 'Earth', colours: ['#f2f4f7', '#2f6fb5', '#3d8a4f', '#2f6fb5', '#f2f4f7'] },
  { id: 'mars', name: 'Mars', colours: ['#c1532f', '#a8452a', '#c9643d'] },
  {
    id: 'jupiter',
    name: 'Jupiter',
    colours: ['#d8c3a5', '#b07f55', '#e6d6bd', '#a86e45', '#d9c19e', '#b88a62'],
  },
  { id: 'saturn', name: 'Saturn', colours: ['#e4c48f', '#caa36a', '#e9d3a5', '#b88d55'] },
  { id: 'uranus', name: 'Uranus', colours: ['#a7dbe0', '#93ced6'] },
  { id: 'neptune', name: 'Neptune', colours: ['#4a6fd1', '#3c5cb8', '#5b80dc'] },
] as const;

/** One image per planet (800×600 PNG data URLs), with alt text and captions. */
export function planetImages(): MediaImage[] {
  return planets.map((planet, index) => {
    const context = canvasOf(800, 600);
    drawStars(context, 800, 600, index + 11, 260);
    drawPlanet(context, 400, 300, 170, planet.colours, planet.id === 'saturn');
    return {
      id: planet.id,
      src: context.canvas.toDataURL('image/png'),
      alt: `${planet.name} against a field of stars`,
      caption: planet.name,
      width: 800,
      height: 600,
      downloadName: `${planet.id}.png`,
    };
  });
}

/** A plain outline of a standing figure (front view) for body-map annotation, as a PNG data URL (600×900). */
export function bodyDiagramImage(): string {
  const context = canvasOf(600, 900);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 600, 900);
  context.strokeStyle = '#3b4250';
  context.lineWidth = 5;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  // Head and neck.
  context.beginPath();
  context.arc(300, 105, 55, 0, Math.PI * 2);
  context.stroke();
  // Body outline: shoulders, arms, hips and legs, drawn as one closed path.
  context.beginPath();
  context.moveTo(275, 158);
  context.lineTo(275, 185);
  context.lineTo(195, 205);
  context.quadraticCurveTo(170, 215, 165, 250);
  context.lineTo(130, 470);
  context.lineTo(160, 478);
  context.lineTo(205, 290);
  context.lineTo(215, 470);
  context.lineTo(225, 840);
  context.lineTo(285, 840);
  context.lineTo(295, 520);
  context.lineTo(305, 520);
  context.lineTo(315, 840);
  context.lineTo(375, 840);
  context.lineTo(385, 470);
  context.lineTo(395, 290);
  context.lineTo(440, 478);
  context.lineTo(470, 470);
  context.lineTo(435, 250);
  context.quadraticCurveTo(430, 215, 405, 205);
  context.lineTo(325, 185);
  context.lineTo(325, 158);
  context.stroke();
  return context.canvas.toDataURL('image/png');
}

/** A simple outline of a refracting telescope on a tripod, as a PNG data URL (900×600). */
export function telescopeDiagramImage(): string {
  const context = canvasOf(900, 600);
  context.fillStyle = '#f7f8fa';
  context.fillRect(0, 0, 900, 600);
  context.strokeStyle = '#2b3240';
  context.lineWidth = 6;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  // Tube, tilted up to the right.
  context.save();
  context.translate(450, 250);
  context.rotate(-0.35);
  context.strokeRect(-280, -40, 520, 80);
  context.strokeRect(240, -55, 60, 110);
  context.strokeRect(-330, -18, 50, 36);
  context.restore();
  // Mount and tripod.
  context.beginPath();
  context.moveTo(450, 260);
  context.lineTo(450, 340);
  context.moveTo(450, 340);
  context.lineTo(330, 560);
  context.moveTo(450, 340);
  context.lineTo(450, 570);
  context.moveTo(450, 340);
  context.lineTo(570, 560);
  context.stroke();
  return context.canvas.toDataURL('image/png');
}

/** A body-map image for annotation stories and tests. */
export function bodyDiagram(): MediaImage {
  return {
    id: 'body',
    src: bodyDiagramImage(),
    alt: 'Outline of a standing figure, front view',
    width: 600,
    height: 900,
  };
}

/** A telescope diagram for annotation stories and tests. */
export function telescopeDiagram(): MediaImage {
  return {
    id: 'telescope',
    src: telescopeDiagramImage(),
    alt: 'Outline of a refracting telescope on a tripod',
    width: 900,
    height: 600,
  };
}

/** Labelled parts of the telescope diagram. */
export const telescopeAnnotations: Annotation[] = [
  {
    id: 'objective',
    kind: 'rect',
    x: 0.69,
    y: 0.06,
    width: 0.14,
    height: 0.3,
    label: 'Dew shield',
    note: 'Keeps dew off the objective lens.',
  },
  { id: 'eyepiece', kind: 'pin', x: 0.17, y: 0.61, label: 'Eyepiece', tone: 'success' },
  {
    id: 'tripod',
    kind: 'polygon',
    points: [
      { x: 0.5, y: 0.55 },
      { x: 0.65, y: 0.95 },
      { x: 0.35, y: 0.95 },
    ],
    label: 'Tripod',
    tone: 'warning',
  },
];

/** A large photo-sized image (6000×4000 by default) as a JPEG Blob URL; revoke it when done. */
export async function largeImageUrl({
  width = 6000,
  height = 4000,
}: { width?: number; height?: number } = {}): Promise<string> {
  const context = canvasOf(width, height);
  drawStars(context, width, height, 3, 30000);
  drawPlanet(
    context,
    width * 0.6,
    height * 0.45,
    height * 0.2,
    ['#d8c3a5', '#b07f55', '#e6d6bd', '#a86e45', '#d9c19e', '#b88a62'],
    false,
  );
  const blob = await new Promise<Blob | null>((resolve) => {
    context.canvas.toBlob(resolve, 'image/jpeg', 0.85);
  });
  if (!blob) {
    throw new Error('Couldn’t encode the image');
  }
  return URL.createObjectURL(blob);
}

/** A source that always fails to load. */
export const BROKEN_IMAGE_SRC = 'data:image/png;base64,AAAA';
