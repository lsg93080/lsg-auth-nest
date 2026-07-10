import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IIdGenerator } from '@/domain/services/id-generator.interface';

@Injectable()
export class UuidIdGenerator implements IIdGenerator {
  generate(): string {
    return uuidv4();
  }
}
