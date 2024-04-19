import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { StatusCodes } from 'http-status-codes';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { logger } from 'digitalp2pbot-utils';
import { User, TelegramHandlerEvent } from 'digitalp2pbot-commons';
import i18next from 'digitalp2pbot-commons';

const defaultRegion = 'us-east-1';

// Base configuration for the DB client
const DBClientParams = {
  region: defaultRegion,
};
if (process.env.NODE_ENV === 'test') {
  // Extend the base configuration with development-specific settings
  Object.assign(DBClientParams, {
    endpoint: process.env.DYNAMODB_ENDPOINT, // Use a specific endpoint if provided
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string, // Assert as string for TypeScript environments
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });
}
const client = new DynamoDBClient(DBClientParams);
const docClient = DynamoDBDocumentClient.from(client);

interface lambdaResponse {
  [key: string]: any;
}

export const main: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  await i18next.changeLanguage('es');
  let body: TelegramHandlerEvent;
  const response: lambdaResponse = {
    method: 'sendMessage',
    chat_id: '',
    text: i18next.t('start'),
  };
  try {
    body = JSON.parse(event.body || '{}');
    const telegramId: string = body.message?.from.id.toString();
    const payload = {
      PK: telegramId,
      userName: body.message.from.username,
      firstName: body.message.from.first_name,
      lastName: body.message.from.last_name,
      lang: body.message.from.language_code,
      isPremium: body.message.from.is_premium,
      isBot: body.message.from.is_bot,
    };
    response.chat_id = body.message.chat.id;
    const user = new User(docClient, i18next);
    await user.updateItem(payload);
  } catch (err) {
    logger.error('start.handler', err);
    response.text = err instanceof Error ? err.message : 'An unexpected error occurred';
  }
  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify(response),
    headers: { 'Content-Type': 'application/json' },
  };
};
