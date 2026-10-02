import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload } from "../../application/auth/login.use-case";
import { requireJwtSecret } from "./jwt-secret";

export type { JwtPayload } from "../../application/auth/login.use-case";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(configService),
    });
  }

  // Return value becomes `request.user`.
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
