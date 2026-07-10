import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '@/domain/value-objects/role.vo';

@Schema({
  timestamps: true,
  collection: 'auth_users',
})
export class User {
  @Prop({ required: true, unique: true, index: true })
  id: string; // Domain UUID

  @Prop({ required: true, unique: true, index: true })
  authProviderId: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  displayName?: string;

  @Prop({ type: [String], enum: Role, default: [Role.PLAYER] })
  roles: Role[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
