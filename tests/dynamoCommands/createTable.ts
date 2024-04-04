import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';
import { table } from 'console';
import deleteTable from './deleteTable';

const createTableParams: CreateTableCommandInput = {
  TableName: '',
  AttributeDefinitions: [
    {
      AttributeName: 'Id',
      AttributeType: 'S', // 'S' stands for String
    },
  ],
  KeySchema: [
    {
      AttributeName: 'Id',
      KeyType: 'HASH', // 'HASH' means partition key
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1,
  },
};

export default async function createTable(client: DynamoDBClient, tableName: string) {
  try {
    createTableParams.TableName = tableName;
    const command = new CreateTableCommand(createTableParams);
    await client.send(command);
  } catch (error) {
    if (error instanceof ResourceInUseException) {
      deleteTable(client, tableName);
      createTable(client, tableName);
    }
    console.error(`Error Creating Table: ${tableName}`, error);
  }
}
