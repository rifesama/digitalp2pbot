import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ItemsService } from 'digitalp2pbot-utils';
import { NumberRangeError, ValueGreaterThanZeroError } from 'digitalp2pbot-utils';

export interface userSchemaInterface {
  telegramId: string;
  userName: string;
  lang: string;
  tradesCompleted: number;
  totalReviews: number;
  lastRating: number;
  totalRating: number;
  volumeTraded: number;
  admin: boolean;
  banned: boolean;
  showUsername: boolean;
  showVolumeTraded: boolean;
  disputes: number;
  defaultCommunityId?: string;
  updatedAt?: Date;
  createdAt?: Date;
}
export class User extends ItemsService {
  constructor(dbClient: DynamoDBDocumentClient) {
    super(dbClient, 'users');
  }
  async beforeCreate(data: Record<string, any>): Promise<void> {
    data.lang = data.lang ?? 'en';
    data.tradesCompleted = data.tradesCompleted ?? 0;
    data.totalReviews = data.totalReviews ?? 0;
    data.totalRating = data.totalRating ?? 0;
    data.lastRating = data.lastRating ?? 0;
    data.volumeTraded = data.volumeTraded ?? 0;
    data.admin = data.admin ?? false;
    data.banned = data.banned ?? false;
    data.showUsername = data.showUsername ?? false;
    data.showVolumeTraded = data.showVolumeTraded ?? false;
    data.disputes = data.disputes ?? 0;
  }
  async validateData(data: Record<string, any>): Promise<void> {
    if (data.lastRating < 0 || data.lastRating > 5) throw new NumberRangeError('Last rating', 0, 5);
    if (data.totalRating < 0 || data.totalRating > 5)
      throw new NumberRangeError('Total Rating', 0, 5);
    if (data.tradesCompleted < 0) throw new ValueGreaterThanZeroError('Trades completed');
    if (data.totalReviews < 0) throw new ValueGreaterThanZeroError('Total reviews');
  }

  async getSchema(): Promise<object> {
    const schema: JTDSchemaType<userSchemaInterface> = {
      properties: {
        telegramId: { type: 'string' },
        userName: { type: 'string' },
        lang: { type: 'string' },
        tradesCompleted: { type: 'uint32' },
        totalReviews: { type: 'uint32' },
        lastRating: { type: 'uint8' },
        totalRating: { type: 'uint8' },
        volumeTraded: { type: 'uint32' },
        admin: { type: 'boolean' },
        banned: { type: 'boolean' },
        showUsername: { type: 'boolean' },
        showVolumeTraded: { type: 'boolean' },
        disputes: { type: 'uint32' },
      },
      optionalProperties: {
        defaultCommunityId: { type: 'string' },
        updatedAt: { type: 'timestamp' },
        createdAt: { type: 'timestamp' },
      },
      additionalProperties: false,
    };
    return schema;
  }
}
