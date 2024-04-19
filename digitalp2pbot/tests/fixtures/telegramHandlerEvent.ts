import { TelegramHandlerEvent } from 'digitalp2pbot-commons';

export const telegramHandlerEvent: TelegramHandlerEvent = {
  update_id: 327399036,
  message: {
    message_id: 16,
    from: {
      id: 9738383973,
      is_bot: false,
      first_name: '⚡️ fake name⚡️',
      last_name: 'fake last name',
      username: 'username',
      language_code: 'en',
      is_premium: true,
    },
    chat: {
      id: 5293305434,
      first_name: '⚡️ fake name⚡️',
      last_name: 'fake last name',
      username: 'username',
      type: 'private',
    },
    date: 1712802293,
    text: '/start',
  },
};
