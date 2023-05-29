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
