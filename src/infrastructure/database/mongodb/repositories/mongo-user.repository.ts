import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUserRepository } from '@/domain/repositories/user.repository.interface';
import { UserEntity } from '@/domain/entities/user.entity';
import { User } from '../schemas/user.schema';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class MongoUserRepository implements IUserRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.userModel.findOne({ id }).exec();
    return UserMapper.toDomain(user);
  }

  async findByAuthProviderId(
    authProviderId: string,
  ): Promise<UserEntity | null> {
    const user = await this.userModel.findOne({ authProviderId }).exec();
    return UserMapper.toDomain(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.userModel.findOne({ email }).exec();
    return UserMapper.toDomain(user);
  }

  async save(userEntity: UserEntity): Promise<UserEntity> {
    const userData = UserMapper.toPersistence(userEntity);

    if (!userEntity.isNewEntity()) {
      const updated = await this.userModel
        .findOneAndUpdate({ id: userEntity.id }, userData, {
          returnDocument: 'after',
        })
        .exec();

      if (!updated) {
        throw new NotFoundException(
          `Save failed: User with id ${userEntity.id} not found`,
        );
      }

      return UserMapper.toDomainOrThrow(updated);
    }

    const created = new this.userModel(userData);
    const saved = await created.save();
    return UserMapper.toDomainOrThrow(saved);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const updated = await this.userModel
      .findOneAndUpdate({ id }, data, { returnDocument: 'after' })
      .exec();

    if (!updated) {
      throw new NotFoundException(
        `Update failed: User with id ${id} not found`,
      );
    }

    return UserMapper.toDomainOrThrow(updated);
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findOneAndDelete({ id }).exec();

    if (!result) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }
}
