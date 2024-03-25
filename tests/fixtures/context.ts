import { Context } from 'aws-lambda';

export function mockContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'mockFunction',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:mockFunction',
    memoryLimitInMB: '128',
    awsRequestId: 'mockRequestID',
    logGroupName: '/aws/lambda/mockFunction',
    logStreamName: 'mockLogStream',
    getRemainingTimeInMillis: () => 15000, // Simulate 15 seconds remaining
    done: (error?: Error, result?: any) => {
      console.log('Mock done called', { error, result });
    },
    succeed: (messageOrObject: any) => {
      console.log('Mock succeed called', { messageOrObject });
    },
    fail: (error: Error | string) => {
      console.log('Mock fail called', { error });
    },
  };
}
