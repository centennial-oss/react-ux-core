import type { Meta, StoryObj } from '@storybook/react-vite';

// Shows every colour token in the current theme. Switch themes in the toolbar.

const SURFACES = ['surface-1', 'surface-2', 'surface-3', 'surface-4'];
const FOREGROUNDS = ['fg', 'fg-muted'];
const TONES = ['neutral', 'accent', 'success', 'warning', 'danger', 'info'];
const CHART = Array.from({ length: 10 }, (_, index) => `chart-${index + 1}`);

function Swatch({ token }: { token: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-8 shrink-0 rounded-control border border-border"
        style={{ background: `var(--color-${token})` }}
      />
      <code className="text-xs text-fg-muted">{`--color-${token}`}</code>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

const meta = {
  title: 'Foundations/Colour tokens',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colours: Story = {
  render: () => (
    <div className="grid max-w-5xl gap-8 bg-surface-1 p-4 text-fg">
      <Section title="Surfaces and text">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SURFACES.map((surface) => (
            <div
              key={surface}
              className="grid gap-1 rounded-card border border-border p-3"
              style={{ background: `var(--color-${surface})` }}
            >
              <code className="text-xs font-semibold">{surface}</code>
              {FOREGROUNDS.map((fg) => (
                <span key={fg} className="text-sm" style={{ color: `var(--color-${fg})` }}>
                  {`Text in ${fg}`}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <Swatch token="border" />
          <Swatch token="border-strong" />
          <Swatch token="focus" />
        </div>
      </Section>

      <Section title="Tones">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TONES.map((tone) => (
            <div
              key={tone}
              className="grid gap-2 rounded-card border p-3"
              style={{
                background: `var(--color-${tone}-bg)`,
                borderColor: `var(--color-${tone}-border)`,
              }}
            >
              <span className="text-sm font-semibold" style={{ color: `var(--color-${tone}-fg)` }}>
                {`${tone} on ${tone}-bg`}
              </span>
              <span
                className="w-fit rounded-control px-2 py-1 text-sm font-medium"
                style={{
                  background: `var(--color-${tone}-solid)`,
                  color: `var(--color-${tone}-on-solid)`,
                }}
              >
                {`${tone}-solid`}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Chart series">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CHART.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </div>
      </Section>
    </div>
  ),
};
