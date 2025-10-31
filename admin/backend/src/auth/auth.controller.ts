import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  login(
    @Res({ passthrough: true }) res: Response,
    @Body() body: { email: string; password: string },
  ) {
    const user = this.authService.validateUser(body.email, body.password);
    if (!user) {
      return { error: 'Invalid credentials' };
    }
    const token = this.authService.login(user);

    // Lưu vào cookie httpOnly
    res.cookie('token', token.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Chỉ gửi cookie qua HTTPS trong production
      maxAge: 3600000, // 1 hour
    });

    return { message: 'Login successful', token: token.access_token };
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token');
    return { message: 'Logout successful' };
  }
}
