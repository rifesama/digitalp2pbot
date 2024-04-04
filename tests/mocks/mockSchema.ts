import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ItemsService } from '../../src/commands/start/itemsService';
import { NumberRangeError, ValueGreaterThanZeroError } from '../../src/commands/start/customError';

export interface mockSchemaInterface {
  Id: string;
  name: string;
  lastName: string;
  phone: string;
  address: string;
  active: boolean;
  updatedAt?: Date;
  createdAt?: Date;
}
export class MockSchema extends ItemsService {
  constructor(dbClient: DynamoDBDocumentClient, tableName: string) {
    super(dbClient, tableName);
  }

  async getSchema(): Promise<object> {
    const schema: JTDSchemaType<mockSchemaInterface> = {
      properties: {
        Id: { type: 'string' },
        name: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        active: { type: 'boolean' },
      },
      optionalProperties: {
        updatedAt: { type: 'timestamp' },
        createdAt: { type: 'timestamp' },
      },
      additionalProperties: false,
    };
    return schema;
  }
}
