import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import Ajv, {JTDSchemaType} from 'ajv/dist/jtd';
const ajv = new Ajv();

export class DynamoCommands {
  private dbClient: DynamoDBDocumentClient;
  private collection: string;

  constructor(dbClient: DynamoDBDocumentClient, collection: string) {
    this.dbClient = dbClient;
    this.collection = collection;
  }

  async getSchema(): Promise<object> {
      return {}
  }
  async validateSchema(data: Record<string,any>) {
    const schema = await this.getSchema()
    const validate = ajv.compile(schema)
    if(validate(data)) 
        return data
    console.error("Failed to save user", ajv.errors)
  }
  async create(data: Record<string, any>): Promise<void> {
    try {
        const now = new Date()
        await this.beforeCreate(data)
        await this.validateSchema(data)
        data.created_at = data.updated_at = now.toUTCString()
        const command = new PutCommand({
          TableName: this.collection,
          Item: data,
        });
        await this.dbClient.send(command);
        console.log('User saved to DynamoDB.');
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  }
  async beforeCreate(data: Record<string, any>): Promise<void> {
  }
  async onCreate(): Promise<void> {}
  async beforeUpdateSetQuery(): Promise<void> {}
  async beforeUpdate(): Promise<void> {}
  async update(): Promise<void> {}
  async onUpdate(): Promise<void> {}
  async beforeDeleteSetCriteria(): Promise<void> {}
  async before_delete(): Promise<void> {}
  async on_delete(): Promise<void> {}
  async delete(): Promise<void> {}
  async beforeLoad(): Promise<void> {}
  async load(): Promise<void> {}
  async onLoad(): Promise<void> {}
  async beforeLoadOne(): Promise<void> {}
  async loadOne(): Promise<void> {}
  async onLoadOne(): Promise<void> {}
  async count(): Promise<void> {}
}
