// Sample code and Markdown for the CodeBlock, Markdown and Prose stories and tests.

export const planetsJson = `{
  "star": "Sun",
  "planets": [
    {
      "name": "Earth",
      "massKg": 5.972e24,
      "radiusKm": 6371,
      "moons": ["Moon"],
      "hasRings": false
    }
  ]
}`;

export const marsOrbitJson = `{
  "body": "Mars",
  "type": "planet",
  "orbit": {
    "semiMajorAxisAu": 1.524,
    "eccentricity": 0.0934,
    "periodDays": 686.98,
    "inclinationDeg": 1.85,
    "moons": ["Phobos", "Deimos"],
    "perihelion": {
      "distanceAu": 1.381,
      "date": "2026-11-23"
    }
  },
  "gravityMs2": 3.721
}`;

export const observationHcl = `observation "andromeda" {
  target    = "M31"
  telescope = "backyard-8in"

  # Long exposures need a clear, moonless night.
  exposure {
    seconds = 120
    frames  = 30
  }
}`;

export const longLine = `python3 projectile.py --velocity 25 --angle 45 --gravity 9.81 --drag 0.0 --steps 1000 --output trajectory.csv --plot`;

export const explanationMarkdown = `**9.8 m/s²** is correct. Near Earth's surface, every object falls with the same acceleration when air resistance is small enough to ignore.

- **Mass doesn't matter:** a bowling ball and a tennis ball dropped together land together.
- **Air resistance does:** a feather falls slowly in air, but as fast as a hammer on the Moon.

Dropping a stone from 20 metres, the numbers work out like this:

\`\`\`json
{
  "drop_height_m": 20,
  "g_ms2": 9.81,
  "fall_time_s": 2.02
}
\`\`\`

See [Free fall](https://en.wikipedia.org/wiki/Free_fall) and the [kinematics drill](/drills/kinematics).`;

export const labMarkdown = `# Measure the Moon's orbit

In this lab you'll track the Moon for a week and estimate how long it takes to orbit Earth, about \`27.3\` days.

## Before you start

- [x] A clear view of the evening sky
- [ ] A star chart or planetarium app

## Steps

1. Each evening at the same time, note the Moon's position against the background stars.
2. Work out how far it moved, in degrees per day:

   \`\`\`bash
   python3 orbit.py --observations moon.csv --report
   \`\`\`

3. Divide 360 degrees by that rate to estimate the orbital period.

> The Moon moves about 13 degrees a day, roughly its own width every hour.

## The inner planets

| Planet | Distance (AU) | Period (years) |
| :--- | :---: | ---: |
| Mercury | 0.39 | 0.24 |
| Venus | 0.72 | 0.62 |
| Earth | 1.00 | 1.00 |
| Mars | 1.52 | 1.88 |

~~The Moon doesn't rotate.~~ It rotates once per orbit, so the same side always faces us.`;
