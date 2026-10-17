// Sample Markdown for MarkdownEditor's stories and tests: a short physics explanation with a list and fenced JSON.

export const newtonMarkdown = `## Newton's second law

The net force on an object equals its mass times its acceleration: **F = m·a**. Push twice as hard and the
acceleration doubles; double the mass and it halves.

- **Force** is measured in newtons (N).
- **Mass** is measured in kilograms (kg).
- **Acceleration** is measured in metres per second squared (m/s²).

A cart on a track, pulled with a spring scale:

\`\`\`json
{
  "mass_kg": 2.0,
  "force_n": 6.0,
  "acceleration_ms2": 3.0
}
\`\`\`

1. Measure the cart's mass.
2. Pull with a steady force and time the run.
3. Check that _force ÷ mass_ matches the measured acceleration.

- [x] Calibrate the spring scale
- [ ] Repeat with a heavier cart`;
