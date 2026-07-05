import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { LoginResult } from "../../application/auth/login.use-case";
import { LoginUseCase } from "../../application/auth/login.use-case";
import type { RegisterResult } from "../../application/auth/register.use-case";
import { RegisterUseCase } from "../../application/auth/register.use-case";
import { VerifyEmailUseCase } from "../../application/auth/verify-email.use-case";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase,
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
}
