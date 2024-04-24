import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import i18next from 'digitalp2pbot-commons';
import { sanitizeMD, getStars, UserAPIGatewayProxyEvent } from 'digitalp2pbot-commons';
import { logger } from 'digitalp2pbot-utils';

interface lambdaResponse {
  [key: string]: any;
}

export const main: APIGatewayProxyHandler = async (event: UserAPIGatewayProxyEvent) => {
  const body = JSON.parse(event.body || '{}');
  const response: lambdaResponse = {
    method: 'sendMessage',
    chat_id: body.message.chat.id,
    text: '',
    parse_mode: 'MarkdownV2',
  };
  try {
    await i18next.changeLanguage(event.user?.lang);
    let botFee = process.env.BOT_FEE?.toString() + '%';
    const totalRating = getStars(
      event.user?.totalRating as number,
      event.user?.totalReviews as number,
    );
    const userInfo = i18next.t('user_info', {
      volume_traded: event.user?.volumeTraded,
      total_rating: totalRating,
      disputes: event.user?.disputes,
    });
    const message = i18next.t('bot_info', { bot_fee: botFee, user_info: userInfo });
    response.text = message;
  } catch (err) {
    logger.error('info.handler', err);
    response.text = err instanceof Error ? err.message : 'An unexpected error occurred';
  }

  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify(response),
    headers: { 'Content-Type': 'application/json' },
  };
};
