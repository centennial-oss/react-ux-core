import './styles.css';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';
import { WAIT_TIMEOUT } from './timeouts';

// findBy* and waitFor wait as long as expect.poll does (vite.config.ts), not Testing Library's 1s default.
configure({ asyncUtilTimeout: WAIT_TIMEOUT });

afterEach(() => {
  cleanup();
});
