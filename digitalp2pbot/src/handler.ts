import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
const lambdaClient = new LambdaClient({ region: 'us-east-1' });

export const main: APIGatewayProxyHandler = async event => {
  const body = JSON.parse(event.body || '{}');
  const command = body.message?.text?.split(' ')[0];
  console.log('this is the body', body);

  let functionName: string;

  switch (command) {
    case '/start':
      functionName = 'digitalp2pbot-dev-startCommand';
      break;
    case '/info':
      functionName = 'digitalp2pbot-dev-infoCommand';
      break;
    default:
      return { statusCode: StatusCodes.BAD_REQUEST, body: `Command not supported ${body.message}` };
  }

  const params = {
    FunctionName: functionName,
    InvocationType: InvocationType.RequestResponse,
    Payload: JSON.stringify(event),
  };

  try {
    const { Payload } = await lambdaClient.send(new InvokeCommand(params));
    const decoder = new TextDecoder('utf-8');
    const payloadText = decoder.decode(Payload);
    const response = JSON.parse(payloadText);
    return response;
  } catch (error) {
    console.error(error);
    return { statusCode: StatusCodes.INTERNAL_SERVER_ERROR, body: 'Internal Server Error' };
  }
};
