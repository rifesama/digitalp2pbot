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
    { AttributeName: 'Id', AttributeType: 'S' },
    { AttributeName: 'dataGroup', AttributeType: 'S' },
    {
      AttributeName: 'createdAt',
      AttributeType: 'S', // 'S' stands for String
    },
  ],
  KeySchema: [
    {
      AttributeName: 'Id',
      KeyType: 'HASH', // 'HASH' means partition key
    },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'createdAt',
      KeySchema: [
        { AttributeName: 'dataGroup', KeyType: 'HASH' }, // Use the same partition key as the main table for GSI
        { AttributeName: 'createdAt', KeyType: 'RANGE' }, // Sort key for the GSI
      ],
      Projection: {
        ProjectionType: 'ALL', // Include all attributes in the index
      },
      ProvisionedThroughput: {
        // Specify throughput for the GSI
        ReadCapacityUnits: 5, // Example capacity units
        WriteCapacityUnits: 5,
      },
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
