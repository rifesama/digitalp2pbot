import dotenv from 'dotenv';
dotenv.config();
import assert from 'assert';
import { main } from '../src/handler';
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
import { DynamoTablePrefix, User } from 'digitalp2pbot-commons';
import { telegramHandlerEvent } from './fixtures/telegramHandlerEvent';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import i18next from '../../digitalp2pbot-commons/libs/i18n';
import { mockProxyResult } from './fixtures/proxyResult';
import { UserAPIGatewayProxyEvent } from 'digitalp2pbot-commons';

describe('TestCases for telegram dispatcher handler', () => {
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

  it('should return command not supported', async () => {
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();
    telegramHandlerEvent.message.text = 'empty';
    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.strictEqual(result.body, 'Command not supported');
  });

  it('should add the user on the api gateway event when the command is info', async () => {
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();

    const response: APIGatewayProxyResult = { statusCode: StatusCodes.OK, body: 'success' };
    const invokeStub = sinon.stub().resolves({
      Payload: Buffer.from(JSON.stringify(response)),
    });
    const invokeCommandFactory = (args: InvokeCommandInput) => new InvokeCommand(args);
    const invokeCommandSpy = sinon.spy(invokeCommandFactory);
    await new User(docClient, i18next).create({
      PK: 123,
      userName: faker.internet.userName(),
      firstName: faker.person.firstName(),
    });
    const dispacherHandler = proxyquire('../src/handler', {
      '@aws-sdk/client-lambda': {
        LambdaClient: sinon.stub().returns({ send: invokeStub }),
        InvokeCommand: invokeCommandSpy,
        InvocationType: proxyquire.noCallThru().load('@aws-sdk/client-lambda', {}).InvocationType,
      },
    });
    telegramHandlerEvent.message.text = '/info';
    telegramHandlerEvent.message.from.id = 123;
    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await dispacherHandler.main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    sinon.assert.calledOnce(invokeCommandSpy);
    const args = invokeCommandSpy.firstCall.args[0];
    const body: UserAPIGatewayProxyEvent = JSON.parse(args.Payload?.toString() || '{}');
    assert.equal(body.user?.PK, `${DynamoTablePrefix.Users}123`);
    assert.equal(body.user?.SK, DynamoTablePrefix.Metadata);
    assert.equal(args.InvocationType, 'RequestResponse');
    assert.strictEqual(result.statusCode, StatusCodes.OK);
  });

  it('should check the function name called', async () => {
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();

    const response: APIGatewayProxyResult = { statusCode: StatusCodes.OK, body: 'success' };
    const invokeStub = sinon.stub().resolves({
      Payload: Buffer.from(JSON.stringify(response)),
    });
    const invokeCommandFactory = (args: InvokeCommandInput) => new InvokeCommand(args);
    const invokeCommandSpy = sinon.spy(invokeCommandFactory);
    const dispacherHandler = proxyquire('../src/handler', {
      '@aws-sdk/client-lambda': {
        LambdaClient: sinon.stub().returns({ send: invokeStub }),
        InvokeCommand: invokeCommandSpy,
        InvocationType: proxyquire.noCallThru().load('@aws-sdk/client-lambda', {}).InvocationType,
      },
    });
    telegramHandlerEvent.message.text = '/info';
    telegramHandlerEvent.message.from.id = 123;
    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await dispacherHandler.main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    sinon.assert.calledOnce(invokeCommandSpy);
    const args = invokeCommandSpy.firstCall.args[0];
    assert.equal(args.FunctionName, 'digitalp2pbot-dev-info');
    assert.strictEqual(result.statusCode, StatusCodes.OK);
  });

  it('should raise internal error server', async () => {
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();
    const expectedError = new Error('error');
    sinon.stub(User.prototype, 'getCommand').throws(expectedError);
    telegramHandlerEvent.message.text = '/info';
    telegramHandlerEvent.message.from.id = 123;
    event.body = JSON.stringify(telegramHandlerEvent);
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    assert.strictEqual(result.statusCode, StatusCodes.OK);
    assert.strictEqual(result.body, 'Internal Server Error');
    sinon.restore();
  });
});
