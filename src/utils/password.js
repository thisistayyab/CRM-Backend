import argon2 from 'argon2';

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password) {
  return argon2.hash(password, HASH_OPTIONS);
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  try {
    return await argon2.verify(storedHash, password);
  } catch {
    return false;
  }
}
