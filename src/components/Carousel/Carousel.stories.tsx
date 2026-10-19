import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { planetImages } from '../../../test/mediaImages';
import { enableVirtualizer } from '../../../test/virtualizer';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Inline, Stack } from '../Layout/Layout';
import { Text } from '../Text/Text';
import { Carousel } from './Carousel';

// Planet images drawn on a canvas in code: deterministic, nothing downloaded.
const planets = planetImages();

const meta = {
  title: 'Display/Carousel',
  component: Carousel,
  args: { 'aria-label': 'Planets', children: null },
} satisfies Meta<typeof Carousel>;
export default meta;
type Story = StoryObj<typeof meta>;

function PlanetSlide({ index }: { index: number }) {
  const planet = planets[index];
  return (
    planet && (
      <figure className="flex flex-col gap-2">
        <img
          src={planet.src}
          alt={planet.alt}
          width={planet.width}
          height={planet.height}
          draggable={false}
          className="aspect-[4/3] h-auto w-full rounded-control bg-surface-3 object-cover"
        />
        <figcaption className="text-center text-sm text-fg-muted">{planet.caption}</figcaption>
      </figure>
    )
  );
}

/** One image at a time: the arrows, the dots, a swipe or drag, or the arrow keys change it. */
export const Images: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Carousel aria-label="Planets">
        {planets.map((planet, index) => (
          <PlanetSlide key={planet.id} index={index} />
        ))}
      </Carousel>
    </div>
  ),
};

/** Thumbnails instead of dots, and looping: past Neptune comes Mercury again. */
export const Thumbnails: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Carousel
        aria-label="Planets"
        isLooping
        renderThumbnail={(index) => (
          <img
            src={planets[index]?.src}
            alt=""
            draggable={false}
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      >
        {planets.map((planet, index) => (
          <PlanetSlide key={planet.id} index={index} />
        ))}
      </Carousel>
    </div>
  ),
};

interface Trip {
  id: string;
  title: string;
  description: string;
  nights: number;
  isNew?: boolean;
}

const trips: Trip[] = [
  {
    id: 'lofoten',
    title: 'Lofoten Islands',
    description: 'Fjords, fishing villages and the midnight sun.',
    nights: 6,
    isNew: true,
  },
  {
    id: 'atacama',
    title: 'Atacama Desert',
    description: 'Salt flats, geysers and the clearest night skies.',
    nights: 5,
  },
  {
    id: 'kyoto',
    title: 'Kyoto',
    description: 'Temples, gardens and a tea ceremony in Gion.',
    nights: 4,
  },
  {
    id: 'patagonia',
    title: 'Patagonia',
    description: 'Glaciers and granite towers at the end of the world.',
    nights: 9,
  },
  {
    id: 'azores',
    title: 'The Azores',
    description: 'Crater lakes, hot springs and whale watching.',
    nights: 5,
    isNew: true,
  },
  {
    id: 'dolomites',
    title: 'Dolomites',
    description: 'Hut-to-hut hiking under pale limestone peaks.',
    nights: 7,
  },
  {
    id: 'namibia',
    title: 'Namibia',
    description: 'Red dunes, desert elephants and the Skeleton Coast.',
    nights: 8,
  },
];

function TripCard({ trip }: { trip: Trip }) {
  return (
    <Card
      title={trip.title}
      description={`${String(trip.nights)} nights`}
      actions={trip.isNew && <Badge tone="accent">New</Badge>}
      footer={
        <Button variant="outline" size="sm">
          View trip
        </Button>
      }
      className="h-full"
    >
      <Text>{trip.description}</Text>
    </Card>
  );
}

/**
 * Cards from `items`, as many in view as the carousel's width allows (one, then two from 24rem, then three from
 * 42rem), moving a page at a time.
 */
export const Cards: Story = {
  render: () => (
    <Stack gap="sm">
      <h2 id="trips-heading" className="text-lg font-semibold">
        Trips
      </h2>
      <Carousel
        aria-labelledby="trips-heading"
        items={trips}
        columns={{ base: 1, sm: 2, md: 3 }}
        moveBy="page"
      >
        {(trip) => <TripCard trip={trip} />}
      </Carousel>
    </Stack>
  ),
};

/**
 * Moves on every 3 seconds and loops. The button stops and starts it; it also pauses while the pointer is over the
 * carousel, while focus is inside it and while the page is hidden, and dragging the slides stops it.
 */
export const Autoplay: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-2xl">
      <Carousel aria-label="Planets" shouldAutoPlay isLooping autoPlayIntervalMs={3000}>
        {planets.map((planet, index) => (
          <PlanetSlide key={planet.id} index={index} />
        ))}
      </Carousel>
    </div>
  ),
};

/** The autoplay button, shown stopped: how an autoplay carousel looks for someone who prefers reduced motion. */
export const AutoplayStopped: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Carousel aria-label="Planets" isPlaying={false} isLooping>
        {planets.map((planet, index) => (
          <PlanetSlide key={planet.id} index={index} />
        ))}
      </Carousel>
    </div>
  ),
};

/** The index from the app: buttons outside jump to a planet, and the carousel reports where it is. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [index, setIndex] = useState(2);
    return (
      <Stack gap="md" className="max-w-2xl">
        <Inline>
          {planets.map((planet, at) => (
            <Button
              key={planet.id}
              size="sm"
              variant={at === index ? 'solid' : 'outline'}
              onPress={() => {
                setIndex(at);
              }}
            >
              {planet.caption}
            </Button>
          ))}
        </Inline>
        <Carousel aria-label="Planets" index={index} onIndexChange={setIndex}>
          {planets.map((planet, at) => (
            <PlanetSlide key={planet.id} index={at} />
          ))}
        </Carousel>
      </Stack>
    );
  },
};

const numbers = Array.from({ length: 10_000 }, (_, index) => index + 1);

/**
 * Ten thousand slides from `items`: only those near the view are rendered, and the picker shows the position
 * instead of dots.
 */
export const ManySlides: Story = {
  render: () => (
    <Carousel aria-label="Numbers" items={numbers} columns={{ base: 2, md: 4 }} gap="sm" isLooping>
      {(number) => (
        <div className="flex h-24 items-center justify-center rounded-control bg-surface-2 text-2xl font-semibold tabular-nums">
          {number}
        </div>
      )}
    </Carousel>
  ),
};

const frames = Array.from({ length: 300 }, (_, index) => ({ id: index + 1 }));

/**
 * Three hundred slides with thumbnails: the strip draws only the thumbnails in view as it scrolls, and keeps the
 * current one in view.
 */
export const LongThumbnailStrip: Story = {
  beforeEach: enableVirtualizer,
  render: () => (
    <div className="max-w-2xl">
      <Carousel
        aria-label="Frames"
        items={frames}
        renderThumbnail={(frame) => (
          <span className="flex size-full items-center justify-center bg-surface-3 text-xs font-semibold tabular-nums">
            {frame.id}
          </span>
        )}
      >
        {(frame) => (
          <div className="flex aspect-video items-center justify-center rounded-control bg-surface-2 text-4xl font-semibold tabular-nums">
            {frame.id}
          </div>
        )}
      </Carousel>
    </div>
  ),
};

/** Without the picker, and without the gap between slides. */
export const PlainArrows: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Carousel aria-label="Planets" hasPicker={false} gap="none" columns={2}>
        {planets.map((planet) => (
          <img
            key={planet.id}
            src={planet.src}
            alt={planet.alt}
            draggable={false}
            className="aspect-[4/3] w-full object-cover"
          />
        ))}
      </Carousel>
    </div>
  ),
};

/** Right to left: the first slide is on the right, the arrows and swipes are mirrored. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl" className="max-w-2xl">
      <Carousel aria-label="Planets" defaultIndex={1}>
        {planets.map((planet, index) => (
          <PlanetSlide key={planet.id} index={index} />
        ))}
      </Carousel>
    </div>
  ),
};
