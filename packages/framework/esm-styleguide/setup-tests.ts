import { afterEach, vi } from 'vitest';
import type {} from '@egen/esm-globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('@egen/esm-api', async () => ({
  ...(await vi.importActual('@egen/esm-api')),
  ...(await import('@egen/esm-api/mock')),
}));
vi.mock('@egen/esm-react-utils', () => import('@egen/esm-react-utils/mock'));
vi.mock('@egen/esm-translations', () => import('@egen/esm-translations/mock'));
vi.mock('@egen/esm-utils', () => import('@egen/esm-utils/mock'));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

window.egenBase = '/egen';
window.spaBase = '/spa';
window.getEgenSpaBase = () => '/egen/spa/';
window.HTMLElement.prototype.scrollIntoView = vi.fn();

afterEach(cleanup);
afterEach(vi.resetAllMocks);
