import { afterAll, beforeAll, beforeEach, describe, expect, type Mock, it, vi } from 'vitest';
import { navigateToUrl } from 'single-spa';
import { navigate } from './navigate';

vi.mock('single-spa');
const mockNavigateToUrl = vi.fn(navigateToUrl);

describe('navigate', () => {
  const originalWindowLocation = window.location;
  let mockLocationAssign: Mock<typeof window.location.assign>;

  beforeAll(() => {
    delete (window as any).location;
    //@ts-ignore
    window.location = { assign: vi.fn(), origin: 'https://egen.alpha.vercel.com' };
    mockLocationAssign = window.location.assign as Mock<typeof window.location.assign>;
  });

  beforeEach(() => {
    mockLocationAssign.mockClear();
    mockNavigateToUrl.mockClear();
  });

  afterAll(() => {
    window.location = originalWindowLocation;
  });

  it('uses location.assign() to navigate to non-SPA path literal', () => {
    navigate({ to: '/some/path' });
    expect(window.location.assign).toHaveBeenCalledWith('/some/path');
    expect(navigateToUrl).not.toHaveBeenCalled();
  });

  it('uses location.assign() to navigate to non-SPA absolute path literal', () => {
    navigate({ to: 'https://single-spa.js.org/' });
    expect(window.location.assign).toHaveBeenCalledWith('https://single-spa.js.org/');
    expect(navigateToUrl).not.toHaveBeenCalled();
  });

  it('uses location.assign() to navigate to non-SPA interpolated path', () => {
    navigate({ to: '${egenBase}/some/path' });
    expect(window.location.assign).toHaveBeenCalledWith('/egen/some/path');
    expect(navigateToUrl).not.toHaveBeenCalled();
  });

  it('uses single-spa navigateToUrl to navigate to SPA path literal', () => {
    navigate({ to: '/egen/spa/foo/page' });
    expect(navigateToUrl).toHaveBeenCalledWith('/egen/spa/foo/page');
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('uses single-spa navigateToUrl to navigate to interpolated SPA path', () => {
    navigate({ to: '${egenSpaBase}/bar/page' });
    expect(navigateToUrl).toHaveBeenCalledWith('/egen/spa/bar/page');
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('tolerates an extra inital slash', () => {
    navigate({ to: '/${egenSpaBase}/baz/page' });
    expect(navigateToUrl).toHaveBeenCalledWith('/egen/spa/baz/page');
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('uses single-spa navigateToUrl if the URL has the current origin', () => {
    navigate({ to: `${window.location.origin}/egen/spa/qux/page` });
    expect(navigateToUrl).toHaveBeenCalledWith('/egen/spa/qux/page');
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
