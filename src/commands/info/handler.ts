import { APIGatewayProxyHandler } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

export const main: APIGatewayProxyHandler = async event => {
  const message = 'Welcome to the bot! How can I assist you today i am info?';
  const body = JSON.parse(event.body);
  const chatId = body.message.chat.id;

  // Respond back to Telegram
  const response = {
    method: 'sendMessage',
    chat_id: chatId,
    text: message,
  };

  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify(response),
    headers: { 'Content-Type': 'application/json' },
  };
};
