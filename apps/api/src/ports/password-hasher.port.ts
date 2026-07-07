export const PASSWORD_HASHER_PORT = Symbol("PasswordHasherPort");

export interface PasswordHasherPort {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}
