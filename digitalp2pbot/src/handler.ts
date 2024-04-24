import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { logger } from 'digitalp2pbot-utils';
import i18next, {
  User,
  TelegramHandlerEvent,
  DynamoTablePrefix,
  userSchemaInterface,
} from 'digitalp2pbot-commons';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UserAPIGatewayProxyEvent } from 'digitalp2pbot-commons';
import { listOfCommands } from 'digitalp2pbot-commons';
const defaultRegion: string = process.env.AWS_DEFAULT_REGION || 'us-east-1';
const STAGE: string = process.env.STAGE || 'dev';

const DBClientParams = {
  region: defaultRegion,
};
if (process.env.NODE_ENV === 'test') {
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
const lambdaClient = new LambdaClient({ region: defaultRegion });

export const main: APIGatewayProxyHandler = async (event: UserAPIGatewayProxyEvent) => {
  const body: TelegramHandlerEvent = JSON.parse(event.body || '{}');
  const userId = body.message.from.id;
  const command = body.message?.text?.split(' ')[0];
  if (!listOfCommands.includes(command.replace('/', ''))) {
    return { statusCode: StatusCodes.OK, body: 'Command not supported' };
  }

  const functionName: string = `digitalp2pbot-${STAGE}-${command.replace('/', '')}`;

  try {
    if (command !== '/start') {
      const params = {
        PK: `${DynamoTablePrefix.Users}${userId}`,
        SK: DynamoTablePrefix.Metadata,
      };
      const user = await new User(docClient, i18next).getCommand(params);
      event.user = user as userSchemaInterface;
    }
    const params = {
      FunctionName: functionName,
      InvocationType: InvocationType.RequestResponse,
      Payload: JSON.stringify(event),
    };
    const { Payload } = await lambdaClient.send(new InvokeCommand(params));
    const decoder = new TextDecoder('utf-8');
    const payloadText = decoder.decode(Payload);
    const response = JSON.parse(payloadText);
    return response;
  } catch (error) {
    logger.error('main.handler', error);
    return { statusCode: StatusCodes.OK, body: 'Internal Server Error' };
  }
};
