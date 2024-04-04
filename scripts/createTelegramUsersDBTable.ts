import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
} from '@aws-sdk/client-dynamodb';

const dynamoDbClient = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
});

const createTableParams: CreateTableCommandInput = {
  TableName: 'users',
  AttributeDefinitions: [
    {
      AttributeName: 'telegramId',
      AttributeType: 'S', // 'S' stands for String
    },
  ],
  KeySchema: [
    {
      AttributeName: 'telegramId',
      KeyType: 'HASH', // 'HASH' means partition key
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1,
  },
};

(async () => {
  try {
    console.log('running');
    const command = new CreateTableCommand(createTableParams);
    const response = await dynamoDbClient.send(command);
    console.log('Table Created Successfully:', response);
  } catch (error) {
    console.error('Error Creating Table:', error);
  }
})();
