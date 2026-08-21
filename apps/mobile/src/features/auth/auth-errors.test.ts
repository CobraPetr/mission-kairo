import { describe, expect, it } from 'vitest';

import { getAuthErrorMessage } from './auth-errors';

describe('getAuthErrorMessage', () => {
  it('returns useful messages without exposing backend details', () => {
    expect(getAuthErrorMessage(new Error('Invalid login credentials'))).toBe(
      'Email or password is incorrect.',
    );
    expect(getAuthErrorMessage(new Error('database host stack trace'))).toBe(
      'The secure channel could not complete the request. Try again.',
    );
  });
});
