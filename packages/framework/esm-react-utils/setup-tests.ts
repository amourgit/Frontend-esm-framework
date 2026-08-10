import { afterEach, vi } from 'vitest';
import type {} from '@egen-civitas/esm-globals';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

global.window.egenBase = '/egen';
global.window.spaBase = '/spa';
global.window.getEgenSpaBase = () => '/egen/spa/';

vi.mock('@egen-civitas/esm-navigation', async () => {
  const actual = await vi.importActual('@egen-civitas/esm-navigation');

  return {
    ...actual,
    navigate: vi.fn(),
  };
});

afterEach(cleanup);
