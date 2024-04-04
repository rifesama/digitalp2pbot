import dotenv from 'dotenv';
dotenv.config();
import assert from 'assert';
import { main } from '../src/commands/start/handler';
import { mockEvent } from './fixtures/event';
import { mockContext } from './fixtures/context';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

describe('TestCases for telegram start command', () => {
  before(() => {
    console.log('Setup before any tests run');
  });

  after(() => {
    console.log('Cleanup after all tests are finished');
  });

  beforeEach(() => {
    console.log('Setup before each test');
  });

  afterEach(() => {
    console.log('Cleanup after each test');
  });
  it('should assert true equals true', async () => {
    assert.strictEqual(true, true);
  });

  it('should create a new user', async () => {
    const event: APIGatewayProxyEvent = mockEvent();
    const context: Context = mockContext();
    event.body = JSON.stringify({
      telegramId: '3',
      userName: 'test2@gmail.com',
      message: { chat: { id: 1 } },
    });
    const result: APIGatewayProxyResult = (await main(
      event,
      context,
      null as any,
    )) as APIGatewayProxyResult;
    assert.strictEqual(result.statusCode, StatusCodes.OK);
  });
});
