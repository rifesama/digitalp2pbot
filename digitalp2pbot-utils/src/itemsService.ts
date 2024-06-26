import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import Ajv, { JTDSchemaType, ErrorObject } from "ajv/dist/jtd";
import addFormats from "ajv-formats";
import {
  ValidationError,
  DatabaseError,
  ResourceNotFoundError,
  InvalidQueryParamsError,
} from "./customError";
import moment from "moment";
import { RecordWithTtl } from "dns";
import { DynamoCommands, DynamoDBResponseCode } from "./dbCommands";

const ajv = new Ajv({ removeAdditional: true, allErrors: true });
addFormats(ajv);
const TIMESTAMP_FORMAT: string = "YYYY-MM-DDTHH:mm:ssZ";
export const PER_PAGE: number = 100;

export class ItemsService extends DynamoCommands {
  constructor(dbClient: DynamoDBDocumentClient, collection: string) {
    super(dbClient, collection);
  }

  async getSchema(): Promise<object> {
    return {};
  }

  getKeyName(): string {
    return "Id";
  }

  setKeyExpressions(data: Record<string, any>): void {}
  /**
   * @param errores Ajv list of errors
   * @returns errors
   * This function threws the list of error using the error ValidationError
   * If you need to set an especific error for a field use the code below
   * errors.forEach(err => {
   *        switch(err.keyword) {
   *            case 'minLength':
   *                err.message = `The field '${err.params.limit}' must be at least ${err.params.limit} characters long.`;
   *                break;
   *            case 'minimum':
   *                err.message = `The field '${err.dataPath}' must be at least ${err.params.limit}.`;
   *                break;
   *            case 'required':
   *                err.message = `The field '${err.params.missingProperty}' is required.`;
   *                break;
   *            default:
   *                err.message = `Validation error on field '${err.dataPath}'`;
   *        }
   *    });
   */
  customHandleErrors(
    errors: ErrorObject<string, Record<string, any>, unknown>[],
  ): ErrorObject<string, Record<string, any>, unknown>[] {
    return errors;
  }
  /**
   *
   * @param errors The list of errors
   */
  validationError(
    errors: ErrorObject<string, Record<string, any>, unknown>[],
  ): void {
    const customErrorsMessages = this.customHandleErrors(errors);
    throw new ValidationError(
      customErrorsMessages
        .map((error: ErrorObject) => {
          return error.message;
        })
        .join(", "),
    );
  }
  async validateSchema(data: Record<string, any>): Promise<void> {
    const schema = await this.getSchema();
    const validate = ajv.compile(schema);
    if (!validate(data)) {
      if (validate.errors) this.validationError(validate.errors);
    }
  }
  async validateData(data: Record<string, any>): Promise<void> {}
  async create(
    data: Record<string, any>,
  ): Promise<Record<string, any> | undefined> {
    this.setKeyExpressions(data);
    await this.beforeCreate(data);
    await this.validateSchema(data);
    await this.validateData(data);
    data.createdAt = data.updatedAt = moment().format(TIMESTAMP_FORMAT);
    const item = await this.putCommand(data);
    return await this.onCreate(item);
  }
  async beforeCreate(data: Record<string, any>): Promise<void> {}
  async onCreate(
    data: Record<string, any> | undefined,
  ): Promise<Record<string, any> | undefined> {
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
      throw new ResourceNotFoundError("Resource not found");
    }
  }

  async updateItem(
    data: Record<string, any>,
  ): Promise<Record<string, any> | undefined> {
    this.setKeyExpressions(data);
    const { keyExpression } = this.getKeyExpression(data, false);
    let item = await this.getCommand(keyExpression);
    if (Object.keys(item ?? {}).length > 0) {
      await this.beforeUpdate(item, data);
      data = { ...item, ...data };
    } else {
      await this.beforeCreate(data);
      data.createdAt = moment().format(TIMESTAMP_FORMAT);
    }
    await this.validateSchema(data);
    await this.validateData(data);
    data.updatedAt = moment().format(TIMESTAMP_FORMAT);
    const result = await this.updateCommand(data);
    if (Object.keys(item ?? {}).length > 0)
      return await this.onUpdate(result ?? {});
    return await this.onCreate(result ?? {});
  }
  async onUpdate(data: Record<string, any>): Promise<Record<string, any>> {
    return data;
  }

  async beforeLoad(
    query: Record<string, any>,
    rawQuery: Record<string, any>,
    fields: string[],
    sort: Record<string, any> = { createdAt: -1 },
  ): Promise<{
    query: Record<string, any>;
    fields: string[];
    sort: Record<string, any>;
  }> {
    return { query, fields, sort };
  }
  async load({
    query = {},
    rawQuery = {},
    fields = [],
    sort,
    perPage = PER_PAGE,
  }: {
    query?: Record<string, any>;
    rawQuery?: Record<string, any>;
    fields?: string[];
    sort?: Record<string, any> | undefined;
    _skip?: number;
    perPage?: number;
  }): Promise<{
    items: Record<string, any>[];
    lastEvaluatedKey: Record<string, any> | undefined;
  }> {
    const result = await this.beforeLoad(query, rawQuery, fields, sort);
    query = result.query;
    fields = result.fields;
    sort = result.sort;
    const { Items, LastEvaluatedKey } = await this.query(
      query,
      fields,
      perPage,
      sort,
    );
    return {
      items: await this.onLoad(Items ?? []),
      lastEvaluatedKey: LastEvaluatedKey,
    };
  }
  async onLoad(items: Record<string, any>[]): Promise<Record<string, any>[]> {
    return items;
  }
  async beforeLoadOne(
    query: Record<string, any>,
    fields: string[] = [],
  ): Promise<{ query: Record<string, any>; fields: string[] }> {
    return { query, fields };
  }
  async loadOne(
    query: Record<string, any> = {},
    fields?: string[],
  ): Promise<Record<string, any>> {
    const result = await this.beforeLoadOne(query, fields);
    query = result.query;
    fields = result.fields;
    let item = await this.getCommand(query, fields);
    if (item != undefined && Object.keys(item).length > 0) {
      return await this.onLoadOne(item);
    } else {
      throw new ResourceNotFoundError("Resource not found");
    }
  }
  async onLoadOne(item: Record<string, any>): Promise<Record<string, any>> {
    return item;
  }
  async beforeDeleteSetCriteria(query: Record<string, any>): Promise<void> {}
  async beforeDelete(
    item: Record<string, any>,
    query: Record<string, any>,
  ): Promise<void> {}
  async onDelete(item: Record<string, any>): Promise<void> {}
  async delete(
    query: Record<string, any> = {},
    logic: boolean = false,
  ): Promise<DeleteCommandOutput> {
    this.beforeDeleteSetCriteria(query);
    const item = await this.getCommand(query);
    if (item != undefined && Object.keys(item).length > 0) {
      this.beforeDelete(item, query);
      const result = await this.deleteCommand(query);
      await this.onDelete(item);
      return result;
    } else {
      throw new ResourceNotFoundError("Resource not found");
    }
  }
  async count(query: Record<string, any>): Promise<number> {
    return await this.countCommand(query);
  }
}
