import { EVENT_NAME } from '../constants';

export type MasterReplyMessageType = {
  source: MessageEventSource;
  origin: string;
  messageId: string;
  success: boolean;
  message?: string;
  data?: Record<string, any>;
};

export type AppSendMessageType = {
  messageId: string;
  apiName: string;
  data: Record<string, any>;
};

export type MasterSendMessageType = {
  apiName: string; // Received the master's message and executed the api name
  eventName: EVENT_NAME;
  data: Record<string, any>;
};

export type AppMessageType = MasterReplyMessageType & MasterSendMessageType;
