import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, Matches, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "correcthorse1",
    description:
      "At least 8 characters, containing at least one letter and one digit.",
  })
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
    message:
      "password must be at least 8 characters and include at least one letter and one digit",
  })
  password!: string;
}
