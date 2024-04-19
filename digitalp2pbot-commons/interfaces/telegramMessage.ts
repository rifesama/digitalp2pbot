interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string | null;
  username?: string | null | undefined;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramChat {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  type?: string; // Could be more specific, e.g., "private" | "group" | "supergroup" | "channel"
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text: string;
}

export interface TelegramHandlerEvent {
  update_id?: number;
  message: TelegramMessage;
}
