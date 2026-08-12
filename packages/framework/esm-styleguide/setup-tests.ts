import { afterEach, vi } from 'vitest';
import type {} from '@egen-civitas/esm-globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('@egen-civitas/esm-api', async () => ({
  ...(await vi.importActual('@egen-civitas/esm-api')),
  ...(await import('@egen-civitas/esm-api/mock')),
}));
vi.mock('@egen-civitas/esm-react-utils', () => import('@egen-civitas/esm-react-utils/mock'));
vi.mock('@egen-civitas/esm-translations', () => import('@egen-civitas/esm-translations/mock'));
vi.mock('@egen-civitas/esm-utils', () => import('@egen-civitas/esm-utils/mock'));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

window.egenBase = '/egen';
window.spaBase = '/spa';
window.getEgenSpaBase = () => '/egen-civitas/spa/';
window.HTMLElement.prototype.scrollIntoView = vi.fn();

afterEach(cleanup);
afterEach(vi.resetAllMocks);
