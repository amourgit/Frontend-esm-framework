/**
 * @vitest-environment jsdom
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import merge from 'lodash/merge';
import { navigate } from '../navigation/navigate';
import { clearHistory, getHistory, goBackInHistory, setupHistory } from './history';

vi.mock('../navigation/navigate');
const mockNavigate = vi.fn(navigate);

describe('history', () => {
  const originalWindowLocation = window.location;
  const originalDocumentReferrer = Object.getOwnPropertyDescriptor(
    Document.prototype,
    'referrer',
  ) as PropertyDescriptor;
  const mockReferrer = 'https://egen.alpha.vercel.com/egen/spa/lalaland';
  let mockLocationAssign: Mock<typeof window.location.assign>;

  beforeAll(() => {
    delete (window as any).location;
    delete (document as any).referrer;
    // @ts-expect-error
    window.location = {
      assign: vi.fn(),
      href: 'https://egen.alpha.vercel.com/egen/spa/chart',
      origin: 'https://egen.alpha.vercel.com',
    };
    mockLocationAssign = window.location.assign as Mock<typeof window.location.assign>;
    window.getEgenSpaBase = () => 'https://egen.alpha.vercel.com/egen/spa';
    Object.defineProperty(document, 'referrer', {
      value: mockReferrer,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    mockLocationAssign.mockClear();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    clearHistory();
  });

  afterAll(() => {
    window.location = originalWindowLocation;
    (document as any).referrer = originalDocumentReferrer;
    Object.defineProperty(document, 'referrer', originalDocumentReferrer);
  });

  it('should be initialized with document.referrer if available', () => {
    setupHistory();
    expect(getHistory()).toEqual([mockReferrer]);
  });

  it('should update history on routing events and go back correctly', () => {
    setupHistory();
    window.location.href = 'https://egen.alpha.vercel.com/egen/spa/labs';
    dispatchRoutingEvent();
    expect(getHistory()).toEqual([mockReferrer, 'https://egen.alpha.vercel.com/egen/spa/labs']);
    window.location.href = 'https://egen.alpha.vercel.com/pharmacy';
    dispatchRoutingEvent();
    window.location.href = 'https://egen.alpha.vercel.com/x-ray';
    dispatchRoutingEvent();
    expect(getHistory()).toEqual([
      mockReferrer,
      'https://egen.alpha.vercel.com/egen/spa/labs',
      'https://egen.alpha.vercel.com/pharmacy',
      'https://egen.alpha.vercel.com/x-ray',
    ]);

    mockNavigate.mockImplementation((params: { to: string }) => {
      window.location.href = params.to;
      dispatchRoutingEvent();
    });
    goBackInHistory({ toUrl: 'https://egen.alpha.vercel.com/egen/spa/labs' });
    expect(getHistory()).toEqual([mockReferrer, 'https://egen.alpha.vercel.com/egen/spa/labs']);
    goBackInHistory({ toUrl: mockReferrer });
    expect(getHistory()).toEqual([mockReferrer]);
  });

  it('should handle in-SPA redirects / replaceState correctly', () => {
    setupHistory();
    window.location.href = 'https://egen.alpha.vercel.com/egen/spa/tests';
    dispatchRoutingEvent();
    window.location.href = 'https://egen.alpha.vercel.com/egen/spa/tests/home';
    dispatchRoutingEvent({ originalEvent: { singleSpaTrigger: 'replaceState' } });
    expect(getHistory()).toEqual([mockReferrer, 'https://egen.alpha.vercel.com/egen/spa/tests/home']);
  });

  it('should handle back button navigation', () => {
    setupHistory();
    window.location.href = 'https://egen.alpha.vercel.com/egen/spa/home';
    dispatchRoutingEvent();
    window.location.href = 'https://egen.alpha.vercel.com/egen/spa/dentist';
    dispatchRoutingEvent();
    window.location.href = 'https://egen.alpha.vercel.com/egen/spa/home';
    dispatchRoutingEvent({ originalEvent: { singleSpa: null } });
    expect(getHistory()).toEqual([mockReferrer, 'https://egen.alpha.vercel.com/egen/spa/home']);
  });
});

function dispatchRoutingEvent(additionalEventDetail: CustomEvent['detail'] = {}) {
  const event = merge({ detail: { originalEvent: { singleSpa: true } } }, { detail: additionalEventDetail });
  window.dispatchEvent(new CustomEvent('single-spa:routing-event', event));
}
