/**
 * JwtAuthGuard:
 * - Mở rộng AuthGuard('jwt') của passport
 * - Kết hợp Reflector để đọc metadata @Public() và bỏ qua guard nếu route public
 *
 * Cách dùng: app.useGlobalGuards(new JwtAuthGuard(reflector)) trong main.ts
 */

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // canActivate chạy trước khi vào controller
  canActivate(context: ExecutionContext) {
    // Kiểm tra xem handler hoặc class có gắn @Public() không
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Nếu public thì cho phép không cần xác thực
      return true;
    }
    // Ngược lại, gọi AuthGuard('jwt') mặc định (sẽ sử dụng JwtStrategy)
    return super.canActivate(context);
  }
}
