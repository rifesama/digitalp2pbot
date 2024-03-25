import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { StatusCodes } from 'http-status-codes';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { User } from './user';

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

export const main: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  console.log('this is the event', event);
  const user = new User(docClient);
  const message = 'Welcome to the bot! How can I assist you today?';
  //const body = JSON.parse(event.body || '{}');
  //const chatId = body.message.chat.id;

  await user.create({ telegram_id: '2', username: 'jonthdiaz'});

  const response = {
    method: 'sendMessage',
    chat_id: '1',
    text: message,
  };
  console.log('send response');
  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify(response),
    headers: { 'Content-Type': 'application/json' },
  };
};
