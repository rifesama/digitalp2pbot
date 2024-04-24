import dotenv from 'dotenv';
dotenv.config();
import assert from 'assert';
import { main } from '../src/start/handler';
import { mockEvent } from './fixtures/event';
import { mockContext } from './fixtures/context';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { StatusCodes } from 'http-status-codes';
import createTable from './dynamoCommands/createTable';
import deleteTable from './dynamoCommands/deleteTable';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { faker } from '@faker-js/faker';
import { lang } from 'moment';
import { DynamoTablePrefix } from 'digitalp2pbot-commons';
import i18n from 'digitalp2pbot-commons';
import { telegramHandlerEvent } from './fixtures/telegramHandlerEvent';

describe('TestCases for telegram start command', () => {
  let client: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  const collection: string = process.env.TABLE_NAME as string;
  before(async () => {
    await i18n.changeLanguage('es');
    client = new DynamoDBClient({
      region: process.env.AWS_DEFAULT_REGION,
      endpoint: process.env.DYNAMODB_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
    docClient = DynamoDBDocumentClient.from(client);
  });

  beforeEach(async () => {
    await createTable(client, collection);
  });

  afterEach(async () => {
    await deleteTable(client, collection);
  });

  it('should raise error username is required', async () => {
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();
    telegramHandlerEvent.message.chat.id = 10;
    telegramHandlerEvent.message.from.username = undefined;
    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.equal(body.chat_id, 10);
    assert.equal(body.method, 'sendMessage');
    assert.equal(body.text, i18n.t('non_handle_error'));
  });

  it('should create a new user when the last name is undefined', async () => {
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();
    telegramHandlerEvent.message.chat.id = 10;
    telegramHandlerEvent.message.from.username = 'test';
    telegramHandlerEvent.message.from.last_name = undefined;
    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.equal(body.chat_id, 10);
    assert.equal(body.text, i18n.t('start'));
  });

  it('should create new user when the last name is null', async () => {
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();
    telegramHandlerEvent.message.chat.id = 10;
    telegramHandlerEvent.message.from.last_name = null;
    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.equal(body.chat_id, 10);
  });
  it('should create the new user', async () => {
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();
    telegramHandlerEvent.message.chat.id = 10;
    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.equal(body.chat_id, 10);
  });

  it('should create the new user with default values', async () => {
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();
    telegramHandlerEvent.message.chat.id = 10;
    telegramHandlerEvent.message.from.username = 'test';
    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body);
    console.log('error', body);
    const command = new GetCommand({
      TableName: collection,
      Key: {
        PK: `${DynamoTablePrefix.Users}${telegramHandlerEvent.message.from.id}`,
        SK: DynamoTablePrefix.Metadata,
      },
    });
    const { Item } = await docClient.send(command);
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.equal(body.chat_id, 10);
    assert.equal(Item?.userName, telegramHandlerEvent.message.from.username);
    assert.equal(Item?.showVolumeTraded, false);
    assert.equal(Item?.totalRating, 0);
    assert.equal(Item?.admin, false);
    assert.equal(Item?.lastRating, 0);
    assert.equal(Item?.disputes, 0);
    assert.equal(Item?.totalReviews, 0);
    assert.equal(Item?.showUsername, false);
    assert.equal(Item?.volumeTraded, 0);
    assert.equal(Item?.tradesCompleted, 0);
    assert.equal(Item?.banned, false);
    assert.equal(Item?.lang, telegramHandlerEvent.message.from.language_code);
    assert.equal(Item?.isPremium, telegramHandlerEvent.message.from.is_premium);
    assert.equal(Item?.isBot, telegramHandlerEvent.message.from.is_bot);
    assert.equal(Item?.firstName, telegramHandlerEvent.message.from.first_name);
    assert.equal(Item?.lastName, telegramHandlerEvent.message.from.last_name);
    assert.notEqual(Item?.updatedAt, null);
    assert.notEqual(Item?.updatedAt, undefined);
    assert.notEqual(Item?.createdAt, null);
    assert.notEqual(Item?.createdAt, undefined);
  });

  it('should update user info', async () => {
    // This test tests when the user use the command /start again, the user data should persist
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();
    telegramHandlerEvent.message.chat.id = 10;
    telegramHandlerEvent.message.from.id = 1;
    telegramHandlerEvent.message.from.first_name = 'user1';
    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    let body = JSON.parse(result.body);
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.equal(body.chat_id, 10);
    telegramHandlerEvent.message.from.id = 1;
    telegramHandlerEvent.message.from.last_name = 'xxxx';
    telegramHandlerEvent.message.from.username = 'xxxx';
    event.body = JSON.stringify(telegramHandlerEvent);
    const resultUserUpdated: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    body = JSON.parse(resultUserUpdated.body);
    assert.strictEqual(resultUserUpdated.statusCode, StatusCodes.OK);
    assert.equal(body.chat_id, 10);
    const command = new GetCommand({
      TableName: collection,
      Key: { PK: `${DynamoTablePrefix.Users}1`, SK: DynamoTablePrefix.Metadata },
    });
    const { Item } = await docClient.send(command);
    assert.equal(Item?.firstName, 'user1');
    assert.equal(Item?.lastName, 'xxxx');
    assert.equal(Item?.userName, 'xxxx');
  });
});
