import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { StatusCodes } from 'http-status-codes';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { User } from './user';
import {logger} from 'digitalp2pbot-utils';
import { error } from 'console';

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

interface lambdaResponse {
  [key: string]: any;
}

export const main: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  console.log('this is the event', event);
  let body: any;
  const response: lambdaResponse = {
    method: 'sendMessage',
    chat_id: '',
    text: '',
  };
  try {
    const message = 'Welcome to the bot! How can I assist you today?';
    body = JSON.parse(event.body || '{}');
    response.chat_id = body.message.chat.id;
    response.text = message;
    const user = new User(docClient);
    await user.create(body);
    return {
      statusCode: StatusCodes.OK,
      body: JSON.stringify(response),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (err) {
    logger.error('users.handler', err);
    response.chat_id = body.message.chat.id;
    response.text = <string>err;
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      body: JSON.stringify(response),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
