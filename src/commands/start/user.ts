import Ajv, {JTDSchemaType} from 'ajv/dist/jtd';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {DynamoCommands} from "./db"

export interface userSchemaInterface{
    telegram_id: string,
    username: string,
    lang?: string
    trades_completed: number
}
export class User extends DynamoCommands  {
  constructor(dbClient: DynamoDBDocumentClient) {
      super(dbClient, "Users")
  }

  async getSchema(): Promise<object> {
    const schema: JTDSchemaType<userSchemaInterface> = {
      properties: {
        telegram_id: {type: "string"},
        username: {type: "string"},
        trades_completed: { "type": "uint32"},
        //total_reviews: { "type": "uint32"},
        //last_rating: { "type": "uint8" },
        //total_rating: { "type": "uint8"},
        //volume_traded: { "type": "uint32" },
        //admin: { "type": "boolean" },
        //banned: { "type": "boolean" },
        //show_username: { "type": "boolean" },
        //show_volume_traded: { "type": "boolean" },
        //disputes: { "type": "uint32"},
        //default_community_id: { "type": "string", nullable: true },
        //updated_at: { "type": "timestamp" },
        //created_at: { "type": "timestamp" }
      },
      optionalProperties:{
        lang: { "type": "string" },
      }
    }
    return schema
  }
}
