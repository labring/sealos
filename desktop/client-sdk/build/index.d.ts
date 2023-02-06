type AppConstructorParam = {
    appKey: string
}

type MasterInitParams = {
    session: Session
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
    private readonly callback;
    constructor(config: AppConstructorParam);
    private sendMessageToMaster;
    init(): () => void;
    getUserInfo(): Promise<Session>;
    getApps(): Promise<any>;
}
declare let sealosApp: ClientSDK;
declare const createSealosApp: (config: AppConstructorParam) => (() => void) | undefined;

declare class MasterSDK {
    private initialized;
    private readonly connectedChild;
    private readonly eventBus;
    private readonly apiFun;
    private session?;
    constructor();
    private replyAppMessage;
    /**
     * run in hook
     */
    init({ session, }: MasterInitParams): () => void;
    /**
     * init connect. add user to cache
     */
    private connectChild;
    private disconnectChild;
    /**
     * add event bus
     */
    addEventListen(name: string, fn: (e?: any) => {
        [key: string]: any;
    }): void;
    /**
     * run event bus function
     */
    private runEventBus;
    private getUserInfo;
}
declare let masterApp: MasterSDK;
declare const createMasterAPP: (config: MasterInitParams) => (() => void) | undefined;

declare enum API_NAME$1 {
    SYSTEM_CONNECT = "system.connect",
    SYSTEM_DISCONNECT = "system.disconnect",
    USER_GET_INFO = "user.getInfo",
    EVENT_BUS = "event-bus"
}

declare enum EVENT_NAME {
    GET_APPS = "get-apps"
}

export { API_NAME$1 as API_NAME, AppSendMessageType, EVENT_NAME, MasterReplyMessageType, createMasterAPP, createSealosApp, masterApp, sealosApp };
