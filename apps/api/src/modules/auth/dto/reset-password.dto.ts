import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ description: "Raw password reset token from the email link" })
  @IsString()
  token!: string;

  @ApiProperty({
    example: "correcthorse1",
    description:
      "At least 8 characters, containing at least one letter and one digit.",
  })
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
    message:
      "newPassword must be at least 8 characters and include at least one letter and one digit",
  })
  newPassword!: string;
}
