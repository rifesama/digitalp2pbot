import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { DatabaseError } from './customError';

type QueryType = Record<string, any>;

type DynamoDBQueryParams = {
    TableName: string;
    KeyConditionExpression?: string;
    FilterExpression?: string;
    ExpressionAttributeNames: Record<string, any>;
    ExpressionAttributeValues: Record<string, any>;
    Limit: number;
    ScanIndexForward: boolean;
    ProjectionExpression?: string; // Note: ProjectionExpression is optional
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
  getKeySchemas(): string[]{
      return ["Id"]
  }
  getKeyExpression(filter: QueryType): {filter: Record<string, any>, keyExpression: Record<string, any>}{
    const queryCopy = {...filter}
    const keyExpression = this.getKeySchemas().reduce((acc, field) => {
    if (queryCopy.hasOwnProperty(field)) {
        acc[field] = filter[field];
        delete filter[field]
    }
    return acc;
    }, {} as Record<string, any>);
    return {filter, keyExpression}
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
          Key: { Id: data[this.#collectionKeyName] },
        });
        const { Item } = await this.dbClient.send(_getCommand);
        return Item;
      }
    } catch (err: any) {
      throw new DatabaseError(err);
    }
  }

  async getCommand(query: Record<string, any>): Promise<Record<string, any> | undefined> {
    try {
      const command = new GetCommand({ TableName: this.collection, Key: query });
      const { Item } = await this.dbClient.send(command);
      return Item ?? {};
    } catch (err: any) {
      throw new DatabaseError(err);
    }
  }

  async query(
    query: Record<string, any>,
    projectionExpression: string[],
    limit: number,
    sort: Record<string, any>,
  ): Promise<Record<string, any>[]> {
    try {
      let command;
      const {filter, keyExpression} = this.getKeyExpression(query)
      const { keyConditionExpression, filterExpression, expressionAttributeNames, expressionAttributeValues } =
      this.buildQueryExpression(filter, keyExpression);
      const params: DynamoDBQueryParams = {
        TableName: this.collection,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit,
        ScanIndexForward: sort[0] != -1, //true for ascending, false for descending
      };
      if(keyConditionExpression){
          params.KeyConditionExpression = keyConditionExpression
      }
      if(filterExpression){
          params.FilterExpression = filterExpression
      }
      if(projectionExpression.length> 0){
          params.ProjectionExpression = projectionExpression.join(",")
      }

      if(keyConditionExpression){
        const { Items } = await this.dbClient.send(new QueryCommand(params));
        return Items ?? [];
      }else{
          const { Items } = await this.dbClient.send(new ScanCommand(params));
          return Items ?? [];
      }
    } catch (err: any) {
      throw new DatabaseError(err);
    }
  }
  buildQueryExpression(filter: QueryType, keyExpression: Record<string, any>): {
    keyConditionExpression: string;
    filterExpression: string;
    expressionAttributeNames: Record<string, any>;
    expressionAttributeValues: Record<string, any>;
  } {
    let keyConditionExpression = '';
    let filterExpression = '';
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, any>={}

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
        keyConditionExpression += `#${key} ${operator} ${expressionKey} and `;
        expressionAttributeValues[expressionKey] = operand;
        expressionAttributeNames[`#${expressionName}`] = key;
      } else {
        // Handle direct equality
        keyConditionExpression += `#${key} = ${expressionKey} and `;
        expressionAttributeValues[expressionKey] = value;
        expressionAttributeNames[`#${expressionName}`] = key;
      }
    }
    // Remove the last ' and '
    keyConditionExpression = keyConditionExpression.slice(0, -5);
    filterExpression = filterExpression.slice(0, -5);
    return { keyConditionExpression, filterExpression, expressionAttributeNames, expressionAttributeValues };
  }
}
