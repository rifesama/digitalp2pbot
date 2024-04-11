import { DynamoDBClient, DeleteTableCommand } from '@aws-sdk/client-dynamodb';

const dynamoDbClient = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
});

const tableName = 'Users';

(async () => {
  try {
    console.log('running');
    const command = new DeleteTableCommand({
      TableName: tableName,
    });
    const response = await dynamoDbClient.send(command);
    console.log('Table Deleted Successfully:', response);
  } catch (error) {
    console.error('Error Deleting Table:', error);
  }
})();
