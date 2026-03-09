import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hash(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function compare(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
