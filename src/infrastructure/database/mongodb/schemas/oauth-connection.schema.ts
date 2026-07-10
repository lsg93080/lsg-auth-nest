import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';

@Schema({
  timestamps: true,
  collection: 'oauth_connections',
})
export class OAuthConnection {
  @Prop({ required: true, unique: true, index: true })
  id: string; // Domain UUID

  @Prop({ required: true, index: true })
  userId: string; // Reference to auth_users.id

  @Prop({ required: true, enum: Object.values(OAuthProvider) })
  provider: OAuthProvider;

  @Prop({ required: true })
  providerUserId: string; // User ID on the provider side

  @Prop({ required: true })
  accessToken: string; // AES-256-GCM encrypted

  @Prop({ type: String, default: null })
  refreshToken: string | null; // AES-256-GCM encrypted

  @Prop({ type: Date, default: null })
  tokenExpiresAt: Date | null;

  @Prop({ type: [String], default: [] })
  scopes: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type OAuthConnectionDocument = HydratedDocument<OAuthConnection>;
export const OAuthConnectionSchema =
  SchemaFactory.createForClass(OAuthConnection);

// Compound index: one connection per user per provider
OAuthConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true });
