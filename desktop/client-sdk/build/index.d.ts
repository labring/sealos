declare enum API_NAME$1 {
    SYSTEM_CONNECT = "system.connect",
    SYSTEM_DISCONNECT = "system.disconnect",
    USER_GET_INFO = "user.getInfo",
    EVENT_BUS = "event-bus"
}

declare enum EVENT_NAME {
    GET_APPS = "get-apps"
}

type OAuthToken = {
    readonly access_token: string;
    readonly token_type: string;
    readonly refresh_token: string;
    readonly expiry: string;
};

type UserInfo = {
    readonly id: string;
    readonly name: string;
    readonly avatar: string;
};

type KubeConfig = string;

type Session = {
    token?: OAuthToken;
    user: UserInfo;
    kubeconfig: KubeConfig;
};

type MasterReplyMessageType = {
    messageId: string
    appKey: string
    success: boolean
    message?: string
    data?: { [key: string]: any }
}

type AppSendMessageType = {
    messageId: string
    apiName: `${API_NAME}`
    appKey: string
    clientLocation: string
    data: { [key: string]: any }
}

declare class ClientSDK {
    private initialized;
    private commonConfig;
    private callback;
    constructor(config: any);
    sendMessageToMaster(apiName: `${API_NAME$1}`, data?: {
        [key: string]: any;
    }): Promise<any>;
    init(): () => void;
    getUserInfo(): Promise<Session>;
    getApps(): Promise<any>;
}
declare let sealosApp: ClientSDK;
declare const createSealosApp: (config: any) => void;

declare class MasterSDK {
    private initialized;
    private readonly connectedChild;
    private readonly eventBus;
    private readonly apiFun;
    private session?;
    constructor();
    replyAppMessage({ appKey, messageId, success, message, data }: MasterReplyMessageType): void;
    /**
     * run in hook
     */
    init({ session, }: {
        session: Session;
    }): () => void;
    /**
     * init connect. add user to cache
     */
    connectChild(data: AppSendMessageType): void;
    disconnectChild(data: AppSendMessageType): void;
    /**
     * add event bus
     */
    addEventListen(name: string, fn: (e?: any) => {
        [key: string]: any;
    }): void;
    /**
     * run event bus function
     */
    runEventBus(data: AppSendMessageType): Promise<void>;
    getUserInfo(data: AppSendMessageType): void;
}
declare let masterApp: MasterSDK;
declare const createMasterAPP: () => void;

export { API_NAME$1 as API_NAME, AppSendMessageType, EVENT_NAME, MasterReplyMessageType, createMasterAPP, createSealosApp, masterApp, sealosApp };
