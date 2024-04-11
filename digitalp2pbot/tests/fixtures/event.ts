// eventFixture.ts
import { APIGatewayProxyEvent } from 'aws-lambda';

export function mockEvent(): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/',
    pathParameters: null,
    queryStringParameters: { name: 'Test' },
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      protocol: 'dummy',
      accountId: 'dummy-account',
      apiId: 'dummy-api-id',
      httpMethod: 'GET',
      authorizer: {},
      identity: {
        clientCert: null,
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: null,
        userArn: null,
      },
      path: '/',
      stage: 'dev',
      requestId: 'dummy-request-id',
      requestTimeEpoch: 1234567890,
      resourceId: 'dummy-resource-id',
      resourcePath: '/',
    },
    resource: '/',
  };
}
