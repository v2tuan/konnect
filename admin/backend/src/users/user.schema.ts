import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export type UserDocument = User & Document;

@Schema({
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, // tự động quản lý createdAt/updatedAt
})
export class User {
  @Prop({ type: String, unique: true, sparse: true })
  phone: string;

  @Prop({ type: String, unique: true, sparse: true })
  email: string;

  @Prop({ type: String, required: true, select: false }) // select:false để mặc định không trả password
  password: string;

  @Prop({ type: String, default: 'https://github.com/shadcn.png' })
  avatarUrl: string;

  @Prop({ type: String, required: true })
  fullName: string;

  @Prop({ type: String, required: true })
  username: string;

  @Prop({ type: Date })
  dateOfBirth: Date;

  @Prop({ type: String, default: '' })
  bio: string;

  @Prop({
    type: Object,
    default: { isOnline: false, lastActiveAt: null },
  })
  status: {
    isOnline: boolean;
    lastActiveAt: Date | null;
  };

  // createdAt, updatedAt được Mongoose tự tạo nhờ timestamps

  @Prop({ type: Boolean, default: false })
  _destroy: boolean;

  // OTP cho quên mật khẩu
  @Prop({ type: String, default: null, select: false })
  resetOtp: string | null;

  @Prop({ type: Date, default: null, select: false })
  resetOtpExpiresAt: Date | null;

  @Prop({ type: Number, default: 0, select: false })
  resetOtpAttempts: number;

  @Prop({ type: Date, default: null, select: false })
  resetLastSentAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

// --- Hook: hash password trước khi save nếu password thay đổi
UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(this.password, salt);
    this.password = hashed;
    next();
  } catch (err) {
    next(err);
  }
});

// --- toJSON transform (chuyển _id -> id, xoá trường nhạy cảm)
// UserSchema.set('toJSON', {
//   virtuals: true,
//   versionKey: false,
//   transform: (doc, ret: any) => {
//     ret.id = ret._id?.toString();
//     delete ret._id;
//     delete ret.password;
//     // các field OTP đã đánh dấu select:false nên thường không có trong ret
//     delete ret.resetOtp;
//     delete ret.resetOtpExpiresAt;
//     delete ret.resetOtpAttempts;
//     delete ret.resetLastSentAt;
//     return ret;
//   },
// });
