import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import Ajv, { JTDSchemaType, ErrorObject } from 'ajv/dist/jtd';
import { ValidationError, DatabaseError, ResourceNotFoundError } from './customError';
import moment from 'moment';
import { RecordWithTtl } from 'dns';
import { DynamoCommands, DynamoDBResponseCode } from './dbCommands';

const ajv = new Ajv({ removeAdditional: true });
const TIMESTAMP_FORMAT: string = 'YYYY-MM-DDTHH:mm:ssZ';

export class ItemsService extends DynamoCommands {
  constructor(dbClient: DynamoDBDocumentClient, collection: string) {
    super(dbClient, collection);
  }

  async getSchema(): Promise<object> {
    return {};
  }

  getKeyName(): string {
    return 'Id';
  }
  async validateSchema(data: Record<string, any>): Promise<void> {
    const schema = await this.getSchema();
    const validate = ajv.compile(schema);
    if (!validate(data)) {
      if (validate.errors)
        throw new ValidationError(
          validate.errors
            .map((error: ErrorObject) => {
              return `Error validation schema ${error.instancePath}: ${error.message}`;
            })
            .join(', '),
        );
    }
  }
  async validateData(data: Record<string, any>): Promise<void> {}
  async create(data: Record<string, any>): Promise<Record<string, any> | undefined> {
    await this.beforeCreate(data);
    await this.validateSchema(data);
    await this.validateData(data);
    data.createdAt = data.updatedAt = moment().format(TIMESTAMP_FORMAT);
    const item = await this.putCommand(data);
    return await this.onCreate(item);
  }
  async beforeCreate(data: Record<string, any>): Promise<void> {}
  async onCreate(data: Record<string, any> | undefined): Promise<Record<string, any> | undefined> {
    return data;
  }
  async beforeUpdateSetQuery(query: Record<string, any>): Promise<void> {}
  async beforeUpdate(
    record: Record<string, any> | undefined,
    data: Record<string, any>,
  ): Promise<void> {}

  async update(
    query: Record<string, any>,
    data: Record<string, any>,
  ): Promise<Record<string, any> | undefined> {
    const now = new Date();
    await this.beforeUpdateSetQuery(query);
    let item = await this.getCommand(query);
    if (item != undefined) {
      await this.beforeUpdate(item, data);
      data = { ...item, ...data };
      await this.validateSchema(data);
      await this.validateData(data);
      data.updatedAt = moment().format(TIMESTAMP_FORMAT);
      item = await this.putCommand(data);
      return await this.onUpdate(item ?? {});
    } else {
      throw new ResourceNotFoundError('Resource not found');
    }
  }

  async onUpdate(data: Record<string, any>): Promise<Record<string, any>> {
    return data;
  }

  async beforeLoad(
    query: Record<string, any>,
    rawQuery: Record<string, any>,
    fields: string[],
    sort: Record<string, any> = { createdAt: -1 },
  ): Promise<{ query: Record<string, any>; fields: string[]; sort: Record<string, any> }> {
    return { query, fields, sort };
  }
  async load({
    query,
    rawQuery,
    fields = [],
    sort,
    _skip = 0,
    perPage = 100,
  }: {
    query: Record<string, any>;
    rawQuery: Record<string, any>;
    fields?: string[];
    sort?: Record<string, any> | undefined;
    _skip?: number;
    perPage?: number;
  }): Promise<Record<string, any>[]> {
    const result = await this.beforeLoad(query, rawQuery, fields, sort);
    query = result.query;
    fields = result.fields;
    sort = result.sort;
    const items = await this.query(query, fields, perPage, sort);
    return await this.onLoad(items ?? []);
  }
  async onLoad(items: Record<string, any>[]): Promise<Record<string, any>[]> {
    return items;
  }
  async beforeLoadOne(): Promise<void> {}
  async loadOne(): Promise<void> {}
  async onLoadOne(): Promise<void> {}
  async beforeDeleteSetCriteria(): Promise<void> {}
  async before_delete(): Promise<void> {}
  async on_delete(): Promise<void> {}
  async delete(): Promise<void> {}
  async count(): Promise<void> {}
}
