import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload } from "../../application/auth/login.use-case";

export type { JwtPayload } from "../../application/auth/login.use-case";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET", "change-me-in-production"),
    });
  }

  // Return value becomes `request.user`.
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
