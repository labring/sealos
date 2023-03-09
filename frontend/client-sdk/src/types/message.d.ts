import { API_NAME } from "../constants"
export type MasterReplyMessageType = {
    source: MessageEventSource
    origin: string
    messageId: string
    success: boolean
    message?: string
    data?: { [key: string]: any }
}

export type AppSendMessageType = {
    messageId: string
    apiName: `${API_NAME}`
    data: { [key: string]: any }
}