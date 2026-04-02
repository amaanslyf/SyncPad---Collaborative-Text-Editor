import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Clean up DOM after each test
afterEach(() => {
  cleanup();
});
