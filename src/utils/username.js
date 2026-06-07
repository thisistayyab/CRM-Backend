import { User } from '../models/user.model.js';

/** Internal login handle — never shown in the UI; derived from email. */
export function deriveUsername(email) {
  const local = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return local || `user${Date.now()}`;
}

export async function ensureUniqueUsername(email) {
  let base = deriveUsername(email);
  let candidate = base;
  let suffix = 0;
  while (await User.findOne({ username: candidate })) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}
