import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Tuỳ chỉnh cách lấy JWT
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1️⃣ Lấy từ Header: Authorization: Bearer <token>
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2️⃣ Lấy từ Cookie (httpOnly)
        (req: Request) => {
          if (req?.cookies?.token) {
            return req.cookies.token;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'edbe33694a2c215ed559a4125620de49',
    });
  }

  validate(payload: { sub: string; username: string }): {
    userId: string;
    username: string;
  } {
    return { userId: payload.sub, username: payload.username };
  }
}
