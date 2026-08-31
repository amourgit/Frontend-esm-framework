import { describe, expect, it } from 'vitest';
import { isProblemDetails } from './problem-details';

describe('isProblemDetails', () => {
  it('returns true for a plain object with a string title', () => {
    expect(isProblemDetails({ title: 'Not Found' })).toBe(true);
  });

  it('returns true for a full RFC 9457 body with all optional members', () => {
    expect(
      isProblemDetails({
        type: 'https://example.com/probs/out-of-credit',
        title: 'You do not have enough credit.',
        status: 403,
        detail: 'Your current balance is 30, but that costs 50.',
        instance: '/account/12345/msgs/abc',
        balance: 30,
      }),
    ).toBe(true);
  });

  it('returns false for a plain object without a title member', () => {
    expect(isProblemDetails({ error: 'The server is dead' })).toBe(false);
  });

  it('returns false when title is present but not a string', () => {
    expect(isProblemDetails({ title: 404 })).toBe(false);
    expect(isProblemDetails({ title: null })).toBe(false);
    expect(isProblemDetails({ title: { nested: true } })).toBe(false);
  });

  it('returns false for a string body', () => {
    expect(isProblemDetails('a string response body')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isProblemDetails(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isProblemDetails(undefined)).toBe(false);
  });

  it('returns false for an array, even one containing an object with a title', () => {
    expect(isProblemDetails([{ title: 'Not Found' }])).toBe(false);
  });

  it('returns false for primitive types', () => {
    expect(isProblemDetails(404)).toBe(false);
    expect(isProblemDetails(true)).toBe(false);
  });

  it('returns false for a non-plain object (e.g. a class instance)', () => {
    class CustomError {
      title = 'Not Found';
    }
    expect(isProblemDetails(new CustomError())).toBe(false);
  });
});
