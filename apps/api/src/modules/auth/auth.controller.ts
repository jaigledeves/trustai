import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ForgotPasswordUseCase } from "../../application/auth/forgot-password.use-case";
import type { LoginResult } from "../../application/auth/login.use-case";
import { LoginUseCase } from "../../application/auth/login.use-case";
import type { JwtPayload } from "../../application/auth/login.use-case";
import type { RegisterResult } from "../../application/auth/register.use-case";
import { RegisterUseCase } from "../../application/auth/register.use-case";
import { ResetPasswordUseCase } from "../../application/auth/reset-password.use-case";
import { VerifyEmailUseCase } from "../../application/auth/verify-email.use-case";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Register a new organization admin user",
    description:
      "Creates a new Organization and an admin User, then dispatches a verification email (stubbed).",
  })
  async register(@Body() dto: RegisterDto): Promise<RegisterResult> {
    return this.registerUseCase.execute(dto.email, dto.password);
  }

  @Get("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify a user's email with a verification token" })
  async verifyEmail(@Query("token") token: string): Promise<{ verified: true }> {
    await this.verifyEmailUseCase.execute(token);
    return { verified: true };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log in with email and password, receive a JWT" })
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.loginUseCase.execute(dto.email, dto.password);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request a password reset email",
    description:
      "Always returns 200 { ok: true } regardless of whether the email is registered (enumeration defense).",
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ ok: true }> {
    await this.forgotPasswordUseCase.execute(dto.email);
    return { ok: true };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset the password using a valid reset token" })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
    await this.resetPasswordUseCase.execute(dto.token, dto.newPassword);
    return { ok: true };
  }

  /** GET /auth/me — returns current user profile. Requires valid JWT. */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user profile" })
  me(@Request() req: { user: JwtPayload }): JwtPayload {
    return req.user;
  }
}
