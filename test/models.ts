// 3D model fixtures built in code (no downloads): an ASCII STL rocket made of boxes, in millimetres with z up, and
// an OBJ cube. `modelUrl` turns either into a blob URL the viewer can load.

type Vec = readonly [number, number, number];

/** The 12 triangles of an axis-aligned box, as STL facets with outward normals. */
function boxFacets(min: Vec, max: Vec): string[] {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const corner = (x: number, y: number, z: number): Vec => [x, y, z];
  const faces: [Vec, Vec, Vec, Vec, Vec][] = [
    // normal, then four corners counter-clockwise seen from outside
    [[0, 0, -1], corner(x0, y0, z0), corner(x0, y1, z0), corner(x1, y1, z0), corner(x1, y0, z0)],
    [[0, 0, 1], corner(x0, y0, z1), corner(x1, y0, z1), corner(x1, y1, z1), corner(x0, y1, z1)],
    [[0, -1, 0], corner(x0, y0, z0), corner(x1, y0, z0), corner(x1, y0, z1), corner(x0, y0, z1)],
    [[0, 1, 0], corner(x0, y1, z0), corner(x0, y1, z1), corner(x1, y1, z1), corner(x1, y1, z0)],
    [[-1, 0, 0], corner(x0, y0, z0), corner(x0, y0, z1), corner(x0, y1, z1), corner(x0, y1, z0)],
    [[1, 0, 0], corner(x1, y0, z0), corner(x1, y1, z0), corner(x1, y1, z1), corner(x1, y0, z1)],
  ];
  const facet = (normal: Vec, a: Vec, b: Vec, c: Vec) =>
    [
      `  facet normal ${normal.join(' ')}`,
      '    outer loop',
      ...[a, b, c].map((vertex) => `      vertex ${vertex.join(' ')}`),
      '    endloop',
      '  endfacet',
    ].join('\n');
  return faces.flatMap(([normal, a, b, c, d]) => [facet(normal, a, b, c), facet(normal, a, c, d)]);
}

/**
 * A model rocket from six boxes, in millimetres with z up: a 20 × 20 × 80 body, a 12 × 12 × 16 nose and four fins.
 * Overall 40 × 40 × 96 mm, 72 triangles.
 */
export const rocketStl = [
  'solid rocket',
  ...boxFacets([-10, -10, 0], [10, 10, 80]),
  ...boxFacets([-6, -6, 80], [6, 6, 96]),
  ...boxFacets([10, -1, 0], [20, 1, 20]),
  ...boxFacets([-20, -1, 0], [-10, 1, 20]),
  ...boxFacets([-1, 10, 0], [1, 20, 20]),
  ...boxFacets([-1, -20, 0], [1, -10, 20]),
  'endsolid rocket',
].join('\n');

/** The rocket's size and triangle count, for assertions. */
export const rocketInfo = { triangles: 72, bounds: { x: 40, y: 40, z: 96 } };

/** A 2-unit cube centred on the origin, with quad faces (12 triangles once split), y up. */
export const cubeObj = `# cube
v -1 -1 -1
v 1 -1 -1
v 1 1 -1
v -1 1 -1
v -1 -1 1
v 1 -1 1
v 1 1 1
v -1 1 1
f 1 4 3 2
f 5 6 7 8
f 1 2 6 5
f 4 8 7 3
f 1 5 8 4
f 2 3 7 6
`;

/** A blob URL for model text (revoke it with `URL.revokeObjectURL` when done). */
export function modelUrl(text: string): string {
  return URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
}

/** A rocket with many more triangles (each box split `times` times along z), for the large-model warning. */
export function stackedRocketStl(times: number): string {
  const facets: string[] = [];
  for (let index = 0; index < times; index += 1) {
    facets.push(...boxFacets([-10, -10, index], [10, 10, index + 1]));
  }
  return ['solid stack', ...facets, 'endsolid stack'].join('\n');
}
