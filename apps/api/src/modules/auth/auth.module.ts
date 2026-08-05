import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { Argon2HasherAdapter } from "../../adapters/argon2/argon2-hasher.adapter";
import { StubNotificationAdapter } from "../../adapters/notification/stub-notification.adapter";
import { PrismaService } from "../../adapters/prisma/prisma.service";
import { PrismaUserRepository } from "../../adapters/prisma/user.repository";
import { ForgotPasswordUseCase } from "../../application/auth/forgot-password.use-case";
import { LoginUseCase } from "../../application/auth/login.use-case";
import { RegisterUseCase } from "../../application/auth/register.use-case";
import { ResetPasswordUseCase } from "../../application/auth/reset-password.use-case";
import { VerifyEmailUseCase } from "../../application/auth/verify-email.use-case";
import { NOTIFICATION_PORT } from "../../ports/notification.port";
import { PASSWORD_HASHER_PORT } from "../../ports/password-hasher.port";
import { USER_REPOSITORY_PORT } from "../../ports/user-repository.port";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          "JWT_SECRET",
          "change-me-in-production",
        ),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN", "7d"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    { provide: USER_REPOSITORY_PORT, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER_PORT, useClass: Argon2HasherAdapter },
    { provide: NOTIFICATION_PORT, useClass: StubNotificationAdapter },
    RegisterUseCase,
    VerifyEmailUseCase,
    LoginUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
