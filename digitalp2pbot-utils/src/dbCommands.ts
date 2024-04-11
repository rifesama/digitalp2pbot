import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
  DeleteCommandOutput,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { DatabaseError, InvalidQueryParamsError } from './customError';
import exp from 'constants';

type QueryType = Record<string, any>;

type DynamoDBQueryParams = {
  TableName: string;
  KeyConditionExpression?: string;
  IndexName?: string;
  FilterExpression?: string;
  ExpressionAttributeNames?: Record<string, any>;
  ExpressionAttributeValues?: Record<string, any>;
  Limit?: number;
  ScanIndexForward?: boolean;
  ProjectionExpression?: string; // Note: ProjectionExpression is optional
};

type DynamoDBGetCommandParams = {
  TableName: string;
  Key: Record<string, any>;
  ProjectionExpression?: string; // Note: ProjectionExpression is optional
  ExpressionAttributeNames?: Record<string, any>;
};
export enum DynamoDBResponseCode {
  Ok = 200,
}
export class DynamoCommands {
  #collectionKeyName: string = 'Id';
  private dbClient: DynamoDBDocumentClient;
  public collection: string;
  constructor(dbClient: DynamoDBDocumentClient, collection: string) {
    this.dbClient = dbClient;
    this.collection = collection;
  }
  getKeySchemas(): string[] {
    return ['PK', 'SK', 'SK_PREFIX'];
  }
  getKeyExpression(filter: QueryType): {
    filter: Record<string, any>;
    keyExpression: Record<string, any>;
  } {
    const queryCopy = { ...filter };
    const keyExpression = this.getKeySchemas().reduce(
      (acc, field) => {
        if (queryCopy.hasOwnProperty(field)) {
          acc[field] = filter[field];
          delete filter[field];
        }
        return acc;
      },
      {} as Record<string, any>,
    );
    return { filter, keyExpression };
  }
  async putCommand(data: Record<string, any>): Promise<Record<string, any> | undefined> {
    try {
      const command = new PutCommand({
        TableName: this.collection,
        Item: data,
      });
      const result = await this.dbClient.send(command);
      if (result.$metadata.httpStatusCode == DynamoDBResponseCode.Ok) {
        const _getCommand = new GetCommand({
          TableName: this.collection,
          Key: { PK: data.PK, SK: data.SK },
        });
        const { Item } = await this.dbClient.send(_getCommand);
        return Item;
      }
    } catch (err: any) {
      throw new DatabaseError(err);
    }
  }
  async deleteCommand(key: Record<string, any>): Promise<DeleteCommandOutput> {
    if (Object.keys(key).length <= 0) throw new InvalidQueryParamsError('key');
    const params = {
      TableName: this.collection,
      Key: key,
    };
    try {
      return await this.dbClient.send(new DeleteCommand(params));
    } catch (err: any) {
      throw new DatabaseError(err);
    }
  }

  async getCommand(
    query: Record<string, any>,
    fields: string[] = [],
  ): Promise<Record<string, any> | undefined> {
    if (Object.keys(query).length <= 0) throw new InvalidQueryParamsError('query');
    try {
      const params: DynamoDBGetCommandParams = { TableName: this.collection, Key: query };
      if (fields.length > 0) {
        const { projectionExpression, expressionAttributeNames } =
          this.convertFieldsToDynamoExpression(fields);
        params.ProjectionExpression = projectionExpression;
        params.ExpressionAttributeNames = expressionAttributeNames;
      }
      const command = new GetCommand(params);
      const { Item } = await this.dbClient.send(command);
      return Item ?? {};
    } catch (err: any) {
      throw new DatabaseError(err);
    }
  }
  convertFieldsToDynamoExpression(fields: string[]): {
    projectionExpression: string;
    expressionAttributeNames: Record<string, any>;
  } {
    let projectionExpression = '';
    const expressionAttributeNames: Record<string, string> = {};

    fields.forEach((field, index) => {
      const placeholder = `#${field}`;

      projectionExpression += `${index > 0 ? ', ' : ''}${placeholder}`;
      expressionAttributeNames[placeholder] = field;
    });

    return { projectionExpression, expressionAttributeNames };
  }

  async query(
    query: Record<string, any>,
    projectionExpression: string[],
    limit: number,
    sort: Record<string, any>,
  ): Promise<{ Items: Record<string, any>[]; LastEvaluatedKey: Record<string, any> | undefined }> {
    try {
      const { filter, keyExpression } = this.getKeyExpression(query);
      const {
        keyConditionExpression,
        filterExpression,
        expressionAttributeNames,
        expressionAttributeValues,
      } = this.buildQueryExpression(filter, keyExpression);
      const params: DynamoDBQueryParams = {
        TableName: this.collection,
        Limit: limit,
        ScanIndexForward: sort[0] != -1, //true for ascending, false for descending
      };
      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }
      if (Object.keys(expressionAttributeValues).length > 0) {
        params.ExpressionAttributeValues = expressionAttributeValues;
      }
      if (Object.keys(keyConditionExpression).length > 0) {
        params.KeyConditionExpression = keyConditionExpression;
      }
      if (Object.keys(filterExpression).length > 0) {
        params.FilterExpression = filterExpression;
      }
      if (projectionExpression.length > 0) {
        params.ProjectionExpression = projectionExpression.join(',');
      }
      if (sort && !keyConditionExpression) {
        params.IndexName = Object.keys(sort)[0];
        //if(params.ExpressionAttributeNames!=undefined){
        //  params.ExpressionAttributeNames["#createdAt"]="createdAt"
        //}
      }
      if (keyConditionExpression) {
        const { Items, LastEvaluatedKey } = await this.dbClient.send(new QueryCommand(params));
        return { Items: Items ?? [], LastEvaluatedKey };
      } else {
        const { Items, LastEvaluatedKey } = await this.dbClient.send(new ScanCommand(params));
        return { Items: Items ?? [], LastEvaluatedKey };
      }
    } catch (err: any) {
      throw new DatabaseError(err);
    }
  }

  async countCommand(query: Record<string, any>): Promise<number> {
    try {
      const { filter, keyExpression } = this.getKeyExpression(query);
      const {
        keyConditionExpression,
        filterExpression,
        expressionAttributeNames,
        expressionAttributeValues,
      } = this.buildQueryExpression(filter, keyExpression);
      const params: QueryCommandInput = {
        TableName: this.collection,
        Select: 'COUNT',
      };
      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }
      if (Object.keys(expressionAttributeValues).length > 0) {
        params.ExpressionAttributeValues = expressionAttributeValues;
      }
      if (Object.keys(keyConditionExpression).length > 0) {
        params.KeyConditionExpression = keyConditionExpression;
      }
      if (Object.keys(filterExpression).length > 0) {
        params.FilterExpression = filterExpression;
      }
      if (keyConditionExpression) {
        const { Count } = await this.dbClient.send(new QueryCommand(params));
        return Count ?? 0;
      } else {
        const { Count } = await this.dbClient.send(new ScanCommand(params));
        return Count ?? 0;
      }
    } catch (err: any) {
      throw new DatabaseError(err);
    }
  }
  buildQueryExpression(
    filter: QueryType,
    keyExpression: Record<string, any>,
  ): {
    keyConditionExpression: string;
    filterExpression: string;
    expressionAttributeNames: Record<string, any>;
    expressionAttributeValues: Record<string, any>;
  } {
    let keyConditionExpression = '';
    let filterExpression = '';
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, any> = {};

    for (const [key, value] of Object.entries(filter)) {
      const expressionKey = `:${key}`;
      const expressionName = `${key}`;

      if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
        // Handle comparison operators
        const operator = Object.keys(value)[0];
        const operand = value[operator];
        filterExpression += `#${key} ${operator} ${expressionKey} and `;
        expressionAttributeValues[expressionKey] = operand;
        expressionAttributeNames[`#${expressionName}`] = key;
      } else {
        // Handle direct equality
        filterExpression += `#${key} = ${expressionKey} and `;
        expressionAttributeValues[expressionKey] = value;
        expressionAttributeNames[`#${expressionName}`] = key;
      }
    }
    for (const [key, value] of Object.entries(keyExpression)) {
      const expressionKey = `:${key}`;
      const expressionName = `${key}`;

      if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
        // Handle comparison operators
        const operator = Object.keys(value)[0];
        const operand = value[operator];
        if (key == 'SK_PREFIX') {
          keyConditionExpression += `begins_with(SK, :${key}) and `;
        } else {
          keyConditionExpression += `#${key} ${operator} ${expressionKey} and `;
          expressionAttributeNames[`#${expressionName}`] = key;
        }
        expressionAttributeValues[expressionKey] = operand;
      } else {
        // Handle direct equality
        if (key == 'SK_PREFIX') {
          keyConditionExpression += `begins_with(SK, :${key}) and `;
        } else {
          keyConditionExpression += `#${key} = ${expressionKey} and `;
          expressionAttributeNames[`#${expressionName}`] = key;
        }
        expressionAttributeValues[expressionKey] = value;
      }
    }
    // Remove the last ' and '
    keyConditionExpression = keyConditionExpression.slice(0, -5);
    filterExpression = filterExpression.slice(0, -5);
    return {
      keyConditionExpression,
      filterExpression,
      expressionAttributeNames,
      expressionAttributeValues,
    };
  }
}
