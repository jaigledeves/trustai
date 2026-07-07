import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import type { PasswordHasherPort } from "../../ports/password-hasher.port";

// OWASP 2023 Argon2id parameter recommendations (RNF-003).
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

@Injectable()
export class Argon2HasherAdapter implements PasswordHasherPort {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
