import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

export interface HealthResponse {
  status: "ok";
  version: string;
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Liveness check — no authentication required" })
  getHealth(): HealthResponse {
    return {
      status: "ok",
      version: process.env["npm_package_version"] ?? "0.1.0",
    };
  }
}
