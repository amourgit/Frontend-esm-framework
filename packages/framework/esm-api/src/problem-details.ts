/** @module @category API */
import { isPlainObject } from 'lodash-es';

/**
 * The members {@link isProblemDetails} actually verifies, shared by both
 * {@link ProblemDetails} and {@link ProblemDetailsLike} — see those two for
 * the one difference between them (whether `type` is required).
 */
interface ProblemDetailsBase {
  /** A short, human-readable summary of the problem type. */
  title: string;
  /** The HTTP status code for this occurrence of the problem. */
  status?: number;
  /** A human-readable explanation specific to this occurrence of the problem. */
  detail?: string;
  /** A URI reference that identifies the specific occurrence of the problem. */
  instance?: string;
  /** Any additional, implementation-specific members of the problem body. */
  [key: string]: unknown;
}

/**
 * The shape of an RFC 9457 ("Problem Details for HTTP APIs") response body,
 * as exposed to callers once the `type` default has been applied (e.g. on
 * {@link EgenFetchError.problem}) — `type` is guaranteed present here.
 *
 * @see https://www.rfc-editor.org/rfc/rfc9457
 */
export interface ProblemDetails extends ProblemDetailsBase {
  /**
   * A URI reference that identifies the problem type. When a response body
   * omits it, {@link isProblemDetails}'s caller is expected to default it to
   * `'about:blank'`, per the RFC.
   */
  type: string;
}

/**
 * What {@link isProblemDetails} actually verifies about a response body,
 * before the `type` default described in {@link ProblemDetails} is applied
 * by the caller. `type` is optional here — RFC 9457 allows a compliant
 * server to omit it — whereas {@link ProblemDetails} itself requires it,
 * since by the time a value is exposed with that type, a caller (such as
 * {@link EgenFetchError}) is expected to have already filled in the
 * `'about:blank'` default.
 */
export interface ProblemDetailsLike extends ProblemDetailsBase {
  type?: string;
}

/**
 * Decides whether `body` looks like an RFC 9457 Problem Details response
 * body: a plain JSON object with a string `title` member.
 *
 * RFC 9457 itself makes every member optional, `title` included — but a
 * body with no `title` gives calling code nothing to distinguish it from any
 * other arbitrary JSON error shape, so this function does not treat it as
 * Problem Details. This is a conservative, explicit heuristic, not a strict
 * reading of the RFC: real-world Problem Details responses (including every
 * example in the RFC itself) include `title`, so this rule accepts them
 * while rejecting unrelated JSON bodies that merely happen to be objects.
 *
 * @param body The parsed response body to inspect. Anything other than a
 *   plain object (a string, `null`, an array, `undefined`...) is rejected
 *   immediately.
 */
export function isProblemDetails(body: unknown): body is ProblemDetailsLike {
  return isPlainObject(body) && typeof (body as Record<string, unknown>).title === 'string';
}
