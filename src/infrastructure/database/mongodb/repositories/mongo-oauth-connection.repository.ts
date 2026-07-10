import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IOAuthConnectionRepository } from '@/domain/repositories/oauth-connection.repository.interface';
import { OAuthConnectionEntity } from '@/domain/entities/oauth-connection.entity';
import { OAuthProvider } from '@/domain/value-objects/oauth-provider.vo';
import { OAuthConnection } from '../schemas/oauth-connection.schema';
import { OAuthConnectionMapper } from '../mappers/oauth-connection.mapper';

@Injectable()
export class MongoOAuthConnectionRepository implements IOAuthConnectionRepository {
  constructor(
    @InjectModel(OAuthConnection.name)
    private connectionModel: Model<OAuthConnection>,
  ) {}

  async findById(id: string): Promise<OAuthConnectionEntity | null> {
    const doc = await this.connectionModel.findOne({ id }).exec();
    return OAuthConnectionMapper.toDomain(doc);
  }

  async findByUserAndProvider(
    userId: string,
    provider: OAuthProvider,
  ): Promise<OAuthConnectionEntity | null> {
    const doc = await this.connectionModel.findOne({ userId, provider }).exec();
    return OAuthConnectionMapper.toDomain(doc);
  }

  async findAllByUser(userId: string): Promise<OAuthConnectionEntity[]> {
    const docs = await this.connectionModel.find({ userId }).exec();
    return OAuthConnectionMapper.toDomainList(docs);
  }

  async save(entity: OAuthConnectionEntity): Promise<OAuthConnectionEntity> {
    const data = OAuthConnectionMapper.toPersistence(entity);

    if (!entity.isNewEntity()) {
      // Upsert
      const updated = await this.connectionModel
        .findOneAndUpdate(
          { userId: entity.userId, provider: entity.provider },
          data,
          { returnDocument: 'after', upsert: true, new: true },
        )
        .exec();

      return OAuthConnectionMapper.toDomainOrThrow(updated);
    }

    const created = new this.connectionModel(data);
    const saved = await created.save();
    return OAuthConnectionMapper.toDomainOrThrow(saved);
  }

  async delete(id: string): Promise<void> {
    const result = await this.connectionModel.findOneAndDelete({ id }).exec();

    if (!result) {
      throw new NotFoundException(`OAuthConnection with id ${id} not found`);
    }
  }

  async deleteConnection(
    connectionId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.connectionModel
      .findOneAndDelete({ id: connectionId, userId })
      .exec();

    return result !== null;
  }
}
