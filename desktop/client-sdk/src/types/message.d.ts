export type MasterReplyMessageType = {
    messageId: string
    appKey: string
    success: boolean
    message?: string
    data?: { [key: string]: any }
}

export type AppSendMessageType = {
    messageId: string
    apiName: `${API_NAME}`
    appKey: string
    clientLocation: string
    data: { [key: string]: any }
}