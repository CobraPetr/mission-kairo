export function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'An account already exists for this email.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  if (message.includes('backend configuration')) {
    return 'The secure backend is not connected in this development build.';
  }
  if (message.includes('username is unavailable')) {
    return 'That callsign is already assigned. Return to Identity and choose another.';
  }
  if (message.includes('verified email and phone required')) {
    return 'Verify both your email and phone before activating the protocol.';
  }

  return 'The secure channel could not complete the request. Try again.';
}
