import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { UserRole } from "../../domain/user.entity";
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from "../../ports/password-hasher.port";
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from "../../ports/user-repository.port";

export interface JwtPayload {
  sub: string;
  organizationId: string;
  role: UserRole;
  email: string;
}

export interface LoginResult {
  accessToken: string;
}

// A precomputed, valid Argon2id hash of a random (discarded) value. It is
// NOT a secret and matches no real password. Verifying against it for
// "email not found" keeps login response time indistinguishable from the
// "wrong password" path (D8) — without it, skipping the Argon2 verify call
// on an unknown email would make that path measurably faster, leaking
// whether an email is registered.
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$hh2O8y7H4dJrpwbkUpoD9g$dgy8xf2GcOlYAGTfTZ7chjdxfW+/eyaw8gEirikvQ1E";

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    private readonly jwtService: JwtService,
  ) {}

  async execute(email: string, password: string): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email);

    // D8: always call verify(), even when no user was found, so response
    // timing does not differ between "wrong password" and "unknown email".
    const isPasswordValid = await this.passwordHasher.verify(
      user?.passwordHash ?? DUMMY_HASH,
      password,
    );

    if (!user || !isPasswordValid) {
      // Same status/body for both failure cases — no user enumeration.
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!user.isVerified()) {
      throw new ForbiddenException("Email address is not verified");
    }

    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    };

    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
