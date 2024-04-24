import dotenv from 'dotenv';
dotenv.config();
import assert from 'assert';
import { main } from '../src/info/handler';
import { mockEvent } from './fixtures/event';
import { mockContext } from './fixtures/context';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { InvokeCommand, LambdaClient, InvokeCommandInput } from '@aws-sdk/client-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { StatusCodes } from 'http-status-codes';
import createTable from './dynamoCommands/createTable';
import deleteTable from './dynamoCommands/deleteTable';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { faker } from '@faker-js/faker';
import { DynamoTablePrefix, User, userSchemaInterface } from 'digitalp2pbot-commons';
import { telegramHandlerEvent } from './fixtures/telegramHandlerEvent';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import i18next from '../../digitalp2pbot-commons/libs/i18n';
import { UserAPIGatewayProxyEvent } from 'digitalp2pbot-commons';
import { sanitizeMD, getStars } from 'digitalp2pbot-commons';

describe('TestCases for info command', () => {
  let client: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  const collection: string = process.env.TABLE_NAME as string;
  const defaultRegion: string = process.env.AWS_DEFAULT_REGION || 'us-east-1';
  before(async () => {
    await i18next.changeLanguage('es');
    client = new DynamoDBClient({
      region: defaultRegion,
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

  it('should return user info', async () => {
    const context: Context = mockContext();

    await new User(docClient, i18next).create({
      PK: 123,
      userName: faker.internet.userName(),
      firstName: faker.person.firstName(),
      lang: 'es',
    });
    const params = {
      PK: `${DynamoTablePrefix.Users}123`,
      SK: DynamoTablePrefix.Metadata,
    };
    const user = await new User(docClient, i18next).getCommand(params);
    const event: UserAPIGatewayProxyEvent = { ...mockEvent(), user: user as userSchemaInterface };
    telegramHandlerEvent.message.from.id = 123;
    telegramHandlerEvent.message.text = '/info';
    event.body = JSON.stringify(telegramHandlerEvent);
    let botFee = process.env.BOT_FEE?.toString() + '%';
    const totalRating = getStars(0, 0);
    const userInfo = i18next.t('user_info', {
      volume_traded: event.user?.volumeTraded,
      total_rating: totalRating,
      disputes: event.user?.disputes,
    });
    const message = i18next.t('bot_info', { bot_fee: botFee, user_info: userInfo });
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body || '{}');
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.equal(body.text, message);
    assert.equal(body.parse_mode, 'MarkdownV2');
  });

  it('should return user info with data different from default', async () => {
    const context: Context = mockContext();

    await new User(docClient, i18next).create({
      PK: 123,
      userName: faker.internet.userName(),
      firstName: faker.person.firstName(),
      lang: 'es',
      totalRating: 5,
      volumeTraded: 1000,
      disputes: 5,
      totalReviews: 100,
    });
    const params = {
      PK: `${DynamoTablePrefix.Users}123`,
      SK: DynamoTablePrefix.Metadata,
    };
    const user = await new User(docClient, i18next).getCommand(params);
    const event: UserAPIGatewayProxyEvent = { ...mockEvent(), user: user as userSchemaInterface };
    telegramHandlerEvent.message.from.id = 123;
    telegramHandlerEvent.message.text = '/info';
    event.body = JSON.stringify(telegramHandlerEvent);
    let botFee = process.env.BOT_FEE?.toString() + '%';
    const totalRating = getStars(5, 100);
    const userInfo = i18next.t('user_info', {
      volume_traded: event.user?.volumeTraded,
      total_rating: totalRating,
      disputes: event.user?.disputes,
    });
    const message = i18next.t('bot_info', { bot_fee: botFee, user_info: userInfo });
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body || '{}');
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.equal(body.text, message);
    assert.equal(body.parse_mode, 'MarkdownV2');
  });
  it('should return interal error server', async () => {
    const context: Context = mockContext();
    const errorMessage: string = faker.music.songName()
    const expectedError = new Error(errorMessage);
    await new User(docClient, i18next).create({
      PK: 123,
      userName: faker.internet.userName(),
      firstName: faker.person.firstName(),
      lang: 'es',
      totalRating: 5,
      volumeTraded: 1000,
      disputes: 5,
      totalReviews: 100,
    });
    const params = {
      PK: `${DynamoTablePrefix.Users}123`,
      SK: DynamoTablePrefix.Metadata,
    };
    const user = await new User(docClient, i18next).getCommand(params);
    const event: UserAPIGatewayProxyEvent = { ...mockEvent(), user: user as userSchemaInterface };
    telegramHandlerEvent.message.from.id = 123;
    telegramHandlerEvent.message.text = '/info';
    const infoHandler = proxyquire('../src/info/handler', {
      'digitalp2pbot-commons': {
        getStars: sinon.stub().throws(expectedError)
      },
    });

    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await infoHandler.main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body || '{}');
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.strictEqual(body.text, errorMessage)
  });
});
