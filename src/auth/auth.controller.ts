import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { RegisterUser } from './dto/RegisterUser.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterUser) {
    return this.authService.register(body);
  }
}
