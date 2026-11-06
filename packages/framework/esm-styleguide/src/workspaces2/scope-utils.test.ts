import { describe, expect, it } from 'vitest';
import { shouldCloseOnUrlChange } from './scope-utils';

describe('shouldCloseOnUrlChange', () => {
  it.each([
    // Static patterns (no capture groups)
    [
      'stays open: both URLs match',
      '^/home/projects',
      'http://localhost/home/projects',
      'http://localhost/home/projects',
      false,
    ],
    [
      'stays open: navigating within scope',
      '^/home/projects',
      'http://localhost/home/projects',
      'http://localhost/home/projects/scheduled',
      false,
    ],
    [
      'closes: navigating away from scope',
      '^/home/projects',
      'http://localhost/home/projects',
      'http://localhost/home/service-queues',
      true,
    ],
    [
      'closes: old URL outside scope',
      '^/home/projects',
      'http://localhost/home/service-queues',
      'http://localhost/home/projects',
      true,
    ],
    [
      'closes: neither URL in scope',
      '^/home/projects',
      'http://localhost/home/service-queues',
      'http://localhost/entity/123/chart',
      true,
    ],

    // Capture groups (entity detail)
    [
      'stays open: same entity, different tab',
      '^/entity/([^/]+)/chart',
      'http://localhost/entity/abc-123/chart/metrics',
      'http://localhost/entity/abc-123/chart/conditions',
      false,
    ],
    [
      'stays open: same entity detail URL',
      '^/entity/([^/]+)/chart',
      'http://localhost/entity/abc-123/chart',
      'http://localhost/entity/abc-123/chart',
      false,
    ],
    [
      'closes: different entity',
      '^/entity/([^/]+)/chart',
      'http://localhost/entity/abc-123/chart',
      'http://localhost/entity/def-456/chart',
      true,
    ],
    [
      'closes: leaving entity detail',
      '^/entity/([^/]+)/chart',
      'http://localhost/entity/abc-123/chart',
      'http://localhost/home/projects',
      true,
    ],
    [
      'closes: entering entity detail',
      '^/entity/([^/]+)/chart',
      'http://localhost/home/projects',
      'http://localhost/entity/abc-123/chart',
      true,
    ],

    // Multiple capture groups
    [
      'stays open: all captures match',
      '^/unit/([^/]+)/entity/([^/]+)',
      'http://localhost/unit/w1/entity/p1/details',
      'http://localhost/unit/w1/entity/p1/metrics',
      false,
    ],
    [
      'closes: first capture differs',
      '^/unit/([^/]+)/entity/([^/]+)',
      'http://localhost/unit/w1/entity/p1',
      'http://localhost/unit/w2/entity/p1',
      true,
    ],
    [
      'closes: second capture differs',
      '^/unit/([^/]+)/entity/([^/]+)',
      'http://localhost/unit/w1/entity/p1',
      'http://localhost/unit/w1/entity/p2',
      true,
    ],

    // Query params and hash are ignored
    [
      'stays open: query param change',
      '^/home/projects',
      'http://localhost/home/projects?tab=scheduled',
      'http://localhost/home/projects?tab=completed',
      false,
    ],
    [
      'stays open: hash change',
      '^/home/projects',
      'http://localhost/home/projects#s1',
      'http://localhost/home/projects#s2',
      false,
    ],

    // Edge cases
    ['closes: invalid regex (safety fallback)', '[invalid', 'http://localhost/home', 'http://localhost/home', true],
    [
      'stays open: relative URLs within scope',
      '^/home/projects',
      '/home/projects',
      '/home/projects/details',
      false,
    ],
    ['closes: relative URLs leaving scope', '^/home/projects', '/home/projects', '/home/service-queues', true],
  ])('%s', (_desc, pattern, oldUrl, newUrl, expected) => {
    expect(shouldCloseOnUrlChange(pattern, oldUrl, newUrl)).toBe(expected);
  });
});
