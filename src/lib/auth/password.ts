import bcrypt from "bcryptjs";

const rounds = () => Number(process.env.BCRYPT_ROUNDS) || 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, rounds());
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Hash compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
let dummy: Promise<string> | undefined;
export const getDummyHash = () => (dummy ??= hashPassword("not-a-real-password"));
