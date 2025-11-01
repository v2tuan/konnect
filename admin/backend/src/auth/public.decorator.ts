// Đánh dấu route là public (không cần xác thực)
// Sử dụng metadata key để guard đọc ra và bỏ qua xác thực
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
