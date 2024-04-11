// eventFixture.ts
import { APIGatewayProxyResult } from 'aws-lambda';

export function mockProxyResult(): APIGatewayProxyResult {
  return {
    statusCode: 200,
    body: '',
  };
}
