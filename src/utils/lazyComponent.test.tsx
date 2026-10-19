import { render, screen } from '@testing-library/react';
import { Component, type ComponentType, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { lazyComponent, preloadComponent } from './lazyComponent';

interface GreetingProps {
  name: string;
}

function Greeting({ name }: GreetingProps) {
  return <p>Hello {name}</p>;
}

function Waiting({ name }: GreetingProps) {
  return <p>Loading {name}</p>;
}

/** A load that finishes when the test says so. */
function deferredLoad() {
  let finish: (component: ComponentType<GreetingProps>) => void = () => undefined;
  let fail: (error: Error) => void = () => undefined;
  const load = vi.fn(
    () =>
      new Promise<ComponentType<GreetingProps>>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      }),
  );
  return {
    load,
    finish: (component: ComponentType<GreetingProps>) => {
      finish(component);
    },
    fail: (error: Error) => {
      fail(error);
    },
  };
}

class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    return this.state.error ? <p role="alert">{this.state.error.message}</p> : this.props.children;
  }
}

describe('lazyComponent', () => {
  it('shows the fallback with the same props until the code loads, loading it once', async () => {
    const { load, finish } = deferredLoad();
    const LazyGreeting = lazyComponent(load, Waiting);
    render(
      <>
        <LazyGreeting name="Ada" />
        <LazyGreeting name="Grace" />
      </>,
    );
    expect(screen.getByText('Loading Ada')).toBeInTheDocument();
    expect(screen.getByText('Loading Grace')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);

    finish(Greeting);
    expect(await screen.findByText('Hello Ada')).toBeInTheDocument();
    expect(screen.getByText('Hello Grace')).toBeInTheDocument();
    expect(screen.queryByText(/Loading/)).toBeNull();
  });

  it('renders straight away once loaded', async () => {
    const { load, finish } = deferredLoad();
    const LazyGreeting = lazyComponent(load, Waiting);
    const first = render(<LazyGreeting name="Ada" />);
    finish(Greeting);
    await screen.findByText('Hello Ada');
    first.unmount();

    render(<LazyGreeting name="Grace" />);
    expect(screen.getByText('Hello Grace')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads ahead of the first render with preloadComponent', async () => {
    const { load, finish } = deferredLoad();
    const LazyGreeting = lazyComponent(load, Waiting);
    preloadComponent(LazyGreeting);
    preloadComponent(LazyGreeting);
    // Components lazyComponent didn't make are ignored.
    preloadComponent(Greeting);
    expect(load).toHaveBeenCalledTimes(1);
    finish(Greeting);
    await new Promise((resolve) => setTimeout(resolve, 0));
    render(<LazyGreeting name="Ada" />);
    expect(screen.getByText('Hello Ada')).toBeInTheDocument();
    expect(screen.queryByText(/Loading/)).toBeNull();
  });

  it('throws a failed load to the error boundary, and loads again on the next mount', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { load, fail, finish } = deferredLoad();
    const LazyGreeting = lazyComponent(load, Waiting);
    const first = render(
      <Boundary>
        <LazyGreeting name="Ada" />
      </Boundary>,
    );
    fail(new Error('Chunk failed'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chunk failed');
    first.unmount();

    render(<LazyGreeting name="Ada" />);
    expect(screen.getByText('Loading Ada')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
    finish(Greeting);
    expect(await screen.findByText('Hello Ada')).toBeInTheDocument();
  });
});
