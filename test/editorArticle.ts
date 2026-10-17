// A long article (about 2,000 words) on how tides work, for RichTextEditor tests and stories. It uses every block
// the editor supports: headings, emphasis, links, inline code, lists, a checklist, a quote, code blocks, images, a
// table and a divider. It's written exactly as the editor writes Markdown, so a round trip returns the same text.

/** Image sources the article uses (example.com URLs; nothing is fetched in tests). */
export const articleImages = {
  bulges: 'https://example.com/images/tidal-bulges.png',
  springNeap: 'https://example.com/images/spring-and-neap.png',
  io: 'https://example.com/images/io-volcanoes.png',
};

export const tidesArticle = `# How Tides Work

Twice a day, almost everywhere along the world's coasts, the sea creeps up the shore and then slips away again. Fishing crews plan around it, harbour pilots time their arrivals by it, and children building sand castles learn about it the hard way. The rhythm is so regular that tide tables can be printed years in advance, yet the forces behind it are subtle. This article walks through where tides come from, why most places get two of them each day, how the Sun joins in, and how scientists turn a few lines of mathematics into predictions accurate to a few centimetres.

## The pull of the Moon

Every object with mass attracts every other object, and the strength of that attraction falls off with the square of the distance between them. The Moon is about **384,400 kilometres** away, and its gravity tugs on the whole Earth. What matters for tides, though, is not the pull itself but the *difference* in pull from one side of the planet to the other. The side of the Earth facing the Moon is roughly 12,700 kilometres closer to it than the far side, so it feels a slightly stronger tug. The Earth's centre feels an average pull, and the far side feels the weakest pull of all.

That difference is called the *tidal force*. It stretches the Earth very gently along the line pointing towards the Moon and squeezes it a little at right angles to that line. Solid rock barely responds, rising and falling by only about 30 centimetres in what geophysicists call the *body tide*. Water, which flows freely, responds far more, and the oceans pile up into two shallow bulges.

## Why there are two bulges

It surprises many people that there is a bulge on the side of the Earth facing *away* from the Moon. The near-side bulge seems natural: the Moon pulls the water towards it. The far-side bulge exists because the Moon pulls the Earth's centre more strongly than it pulls the water on the far side, so that water is, in effect, left behind. Seen from the Earth's centre, both bulges point outwards, and the tidal force has the same shape on both sides.

![Diagram of the Earth with two ocean bulges, one facing the Moon and one facing away](https://example.com/images/tidal-bulges.png)

As the Earth turns once a day beneath these two bulges, a point on the coast passes through both of them, which gives two high tides and two low tides. The Moon is also moving along its orbit in the same direction that the Earth spins, so the Earth has to turn a little further each day to catch up with it. That is why high tide arrives about 50 minutes later each day, and why the full cycle of two tides takes **12 hours and 25 minutes** rather than exactly 12 hours.

Real oceans do not form neat bulges. Continents block the water, the sea floor drags on it, and the Earth turns far faster than a wave could travel around the globe. Instead, the tide sweeps around ocean basins as enormous waves that rotate about points where the tidal range is nearly zero. Oceanographers call these points *amphidromic points*, and the lines radiating from them, which join places where high water arrives at the same time, are *co-tidal lines*.

## The Sun's share: spring and neap tides

The Sun is about 27 million times more massive than the Moon, but it is also about 390 times further away. Because the tidal force depends on the *cube* of distance rather than the square, the Sun's tidal effect on the Earth works out to a little under half of the Moon's. It produces its own pair of bulges, and the tide we see is the sum of the two patterns.

When the Sun, the Moon and the Earth line up, at new moon and full moon, the two sets of bulges reinforce each other. High tides are higher and low tides are lower, and these are called *spring tides*, although they have nothing to do with the season; the name comes from the idea of the water springing up. When the Sun and Moon are at right angles to each other, at first and last quarter, their bulges partly cancel. The tidal range is smaller, and these are *neap tides*.

![Two diagrams comparing the alignment of the Sun and Moon at spring tide and at neap tide](https://example.com/images/spring-and-neap.png)

The table below shows typical ranges at a few well-known places. The figures are rounded, and the actual range on a given day also depends on the weather and the Moon's distance.

| Location | Typical spring range | Typical neap range | Tides per day |
| --- | --- | --- | --- |
| Bay of Fundy, Canada | 16 m | 9 m | 2 |
| Severn Estuary, UK | 14 m | 7 m | 2 |
| Mont-Saint-Michel, France | 13 m | 6 m | 2 |
| Gulf of Mexico coast | 0.6 m | 0.3 m | 1 |
| Mediterranean Sea | 0.3 m | 0.1 m | 2 |

The Gulf of Mexico stands out because many places there have only one high tide and one low tide each day. These *diurnal tides* happen where the shape of the basin responds more strongly to the once-a-day part of the tidal force than to the twice-a-day part. Places such as Seattle and Los Angeles have *mixed tides*, where the two daily high tides differ noticeably in height.

## Predicting the tide

Tide prediction rests on a powerful idea: the complicated rise and fall of the sea at one place can be described as the sum of many simple, regular waves, each tied to a particular motion of the Earth, the Moon or the Sun. These waves are called *tidal constituents*. The largest is the principal lunar semi-diurnal constituent, known as \`M2\`, with a period of about 12.42 hours. Next come \`S2\` for the Sun, with a period of exactly 12 hours, and \`K1\` and \`O1\`, which have periods close to a day.

To build a prediction for a harbour, scientists record the water level for at least a month, and preferably a year, and then work out the amplitude and the phase of each constituent at that site. Once those numbers are known, predicting the future is a matter of adding the waves back together. The short program below shows the idea with four constituents.

\`\`\`python
import math

# Amplitude (m), phase (degrees) and speed (degrees per hour) for four constituents.
CONSTITUENTS = {
    "M2": (1.20, 110.0, 28.984),
    "S2": (0.40, 140.0, 30.000),
    "K1": (0.15, 200.0, 15.041),
    "O1": (0.10, 185.0, 13.943),
}

def tide_height(hours, mean_level=2.5):
    height = mean_level
    for amplitude, phase, speed in CONSTITUENTS.values():
        height += amplitude * math.cos(math.radians(speed * hours - phase))
    return height

for hour in range(0, 25, 3):
    print(f"{hour:02d}:00  {tide_height(hour):.2f} m")
\`\`\`

Before electronic computers, this summing was done by machines. Lord Kelvin designed the first tide-predicting machine in 1872, using a system of pulleys and wheels, one for each constituent, to drive a pen across a moving roll of paper. Later machines handled dozens of constituents and stayed in service until the 1960s. Modern predictions use the same mathematics, but a laptop can now compute a year of tides for a harbour in a fraction of a second. If you prefer configuration files to code, a prediction service might describe a station like this:

\`\`\`json
{
  "station": "Harbour Point",
  "datum": "lowest astronomical tide",
  "constituents": ["M2", "S2", "K1", "O1"],
  "intervalMinutes": 6
}
\`\`\`

## Tides around the world

Local geography shapes the tide as much as astronomy does. A few patterns appear again and again:

- **Funnel-shaped bays** concentrate the incoming tide, which is why the Bay of Fundy and the Severn Estuary have such enormous ranges.
- **Resonance** happens when the natural sloshing period of a basin is close to the tidal period, amplifying the tide much as pushing a swing at the right moment builds up its motion.
- **Enclosed seas**, such as the Mediterranean and the Baltic, are too small and too cut off from the open ocean to build large tides.
- **Tidal bores** form in some rivers when the rising tide arrives as a single breaking wave that travels upstream:
    - the Qiantang River in China has one of the largest, sometimes several metres high;
    - the Severn bore attracts surfers who ride it for kilometres;
    - the Amazon's bore, the *pororoca*, can be heard long before it arrives.

When planning a visit to the shore, a few steps help you read the tide safely:

1. Look up the tide table for the nearest station, not just the nearest town.
2. Note the times of high and low water and the height of each.
3. Allow for weather: strong onshore winds and low air pressure can raise the water above the predicted level.
4. Keep an eye on the time, and leave tidal islands and causeways well before the water returns.

## Tidal locking and the slowing day

Tides do not only move water; they also move energy. As the Earth spins, friction between the oceans and the sea floor drags the tidal bulges slightly ahead of the line between the Earth and the Moon. The Moon's gravity pulls back on the leading bulge, which acts as a brake on the Earth's rotation. At the same time, the bulge pulls the Moon forward along its orbit, which raises it gradually into a higher orbit.

The effect is small but measurable. The Moon is moving away from the Earth at about **3.8 centimetres per year**, a figure confirmed by bouncing laser beams off reflectors left on the lunar surface by the Apollo missions. The Earth's day is lengthening by roughly 2 milliseconds per century. Growth rings in ancient corals suggest that about 400 million years ago a year lasted around 400 days, because each day was shorter.

> The same process has already finished its work on the Moon. Tides raised in the young Moon by the Earth slowed its spin until one face pointed towards us permanently, which is why we always see the same side.

This state is called *tidal locking*, and it is common in the Solar System. Most large moons, including those of Jupiter and Saturn, are locked to their planets. Pluto and its moon Charon go one step further: each keeps the same face towards the other, so they spin like a pair of dancers holding hands.

## Measuring tides

For centuries, tides were measured with a marked pole called a *tide staff*, read by eye at regular intervals. In the nineteenth century, *tide gauges* appeared: a float in a vertical pipe, connected to the sea through a small hole that damped out waves, drove a pen on a rotating drum. Today, most gauges use pressure sensors, acoustic sensors or radar, and they report readings by satellite every few minutes. Satellite altimeters, which measure the height of the sea surface from orbit, have mapped tides across the open ocean in remarkable detail.

A school or club running its own small tide survey might work through a list like this one:

- [x] Choose a site with safe access at low water and a fixed structure to mount a staff on.
- [x] Survey the staff's zero point against a local benchmark.
- [ ] Record the water level every 15 minutes for at least two full tidal cycles.
- [ ] Note the wind speed, wind direction and air pressure at each reading.
- [ ] Compare the readings with the official prediction and explain the differences.

The comparison at the end is often the most interesting part. Differences of 10 or 20 centimetres are common, and they usually come from weather: a *storm surge* driven by strong winds and low pressure can add a metre or more to the tide, and when it coincides with a spring tide it can cause serious flooding.

## Tides beyond Earth

Tidal forces shape worlds throughout the Solar System. Jupiter's moon Io is squeezed and stretched as it moves along a slightly elliptical orbit, alternately closer to and further from the giant planet. The constant flexing heats its interior so strongly that Io is the most volcanically active body known, with hundreds of active volcanoes and lava lakes.

![Io, a yellow and orange moon covered in volcanic plains, with a plume rising from its edge](https://example.com/images/io-volcanoes.png)

Further out, the same kind of tidal heating keeps liquid water oceans beneath the icy crusts of Europa and Enceladus. These hidden oceans are among the most promising places to look for life beyond the Earth, and missions such as [Europa Clipper](https://europa.nasa.gov/) are designed to study them. Tides even matter on the largest scales: when two galaxies pass close to each other, tidal forces pull long streams of stars out of them, drawing the graceful *tidal tails* seen in many telescope images.

## Further reading

To explore the subject further, try these:

- The [NOAA Tides and Currents](https://tidesandcurrents.noaa.gov/) service publishes predictions and live water levels for thousands of stations.
- A good introductory oceanography textbook will cover the dynamic theory of tides and amphidromic systems in depth.
- Planetarium shows and science museum exhibits often include working models of tide-predicting machines.

---

The next time you watch the sea retreat across a beach, remember that you are seeing the Earth being gently stretched by the Moon and the Sun, a motion that has been slowing our planet's spin and pushing the Moon away for billions of years. The tide is one of the few places where the mechanics of the heavens can be seen with the naked eye, a few metres at a time, twice a day.`;

const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="200" viewBox="0 0 480 200"><rect width="480" height="200" fill="#0b1d3a"/>${body}</svg>`,
  )}`;

/** Drawn stand-ins for the article's images (inline SVG, so stories load nothing). */
export const articleImageData = {
  bulges: svg(
    '<ellipse cx="200" cy="100" rx="92" ry="70" fill="#2f6fb3" opacity="0.6"/><circle cx="200" cy="100" r="60" fill="#3d8b4f"/><circle cx="420" cy="100" r="18" fill="#d9d9d9"/>',
  ),
  springNeap: svg(
    '<circle cx="40" cy="100" r="22" fill="#f5c542"/><circle cx="140" cy="100" r="30" fill="#3d8b4f"/><circle cx="200" cy="100" r="9" fill="#d9d9d9"/><circle cx="280" cy="100" r="22" fill="#f5c542"/><circle cx="380" cy="100" r="30" fill="#3d8b4f"/><circle cx="380" cy="40" r="9" fill="#d9d9d9"/>',
  ),
  io: svg(
    '<circle cx="240" cy="100" r="80" fill="#e3b341"/><circle cx="210" cy="80" r="12" fill="#a0522d"/><circle cx="270" cy="120" r="9" fill="#8b4513"/><path d="M315 60 q20 -40 40 0" stroke="#f0e6c8" stroke-width="4" fill="none"/>',
  ),
};

/** The article with its images drawn inline, for stories. */
export const tidesArticleWithImages = tidesArticle
  .replace(articleImages.bulges, articleImageData.bulges)
  .replace(articleImages.springNeap, articleImageData.springNeap)
  .replace(articleImages.io, articleImageData.io);

/** People to @-mention in examples. */
export const astronomers = [
  { id: 'ada', label: 'Ada Lovelace' },
  { id: 'annie', label: 'Annie Jump Cannon' },
  { id: 'cecilia', label: 'Cecilia Payne-Gaposchkin' },
  { id: 'grace', label: 'Grace Hopper' },
  { id: 'henrietta', label: 'Henrietta Leavitt' },
  { id: 'vera', label: 'Vera Rubin' },
];

/** A mention loader over `astronomers` that answers at once. */
export async function findAstronomers(query: string, signal: AbortSignal) {
  await Promise.resolve();
  if (signal.aborted) {
    return [];
  }
  const search = query.toLowerCase();
  return astronomers.filter((person) => person.label.toLowerCase().includes(search));
}

/** An image "upload" that keeps the file in the page as a data URL. */
export function uploadAsDataUrl(file: File): Promise<{ src: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ src: typeof reader.result === 'string' ? reader.result : '' });
    };
    reader.onerror = () => {
      reject(new Error('read failed'));
    };
    reader.readAsDataURL(file);
  });
}
