import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private adminUsers = [
    {
      userId: 'admin',
      email: 'admin@gmail.com',
      username: 'admin',
      password: 'admin',
    },
  ];

  constructor(private jwtService: JwtService) {}

  validateUser(email: string, password: string) {
    const user = this.adminUsers.find(
      (user) => user.email === email && user.password === password,
    );
    if (user) {
      const { ...result } = user;
      return result;
    }
    return null;
  }

  login(user: { username: string; userId: string }) {
    const payload = { username: user.username, userId: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
