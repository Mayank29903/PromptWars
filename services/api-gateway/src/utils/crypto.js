import crypto from 'crypto';

// General purpose extra crypto functionality if needed. Bcrypt is used for passwords.
export function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}
