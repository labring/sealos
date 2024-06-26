import { v4 } from 'uuid';
import { API_NAME } from './constants';
import { AppMessageType, AppSendMessageType, MasterReplyMessageType, SessionV1 } from './types';
import { isBrowser } from './utils';

class ClientSDK {
  private readonly eventBus = new Map<string, (e?: any) => any>();
  private initialized = false;
  private desktopOrigin = '*';
  private commonConfig = {
    appKey: '',
    clientLocation: '',
    success: false
  };
  private userSession: SessionV1 | undefined;
  private readonly callback = new Map<string, (data: MasterReplyMessageType) => void>();
  private readonly apiFun: {
    [key: string]: (data: AppMessageType) => void;
  } = {
    [API_NAME.EVENT_BUS]: (data) => this.runAppEvents(data)
  };

  private sendMessageToMaster(
    apiName: `${API_NAME}`,
    data: Record<string, any> = {},
    needReply = true
  ): Promise<any> {
    if (!this.initialized) return Promise.reject('APP is uninitialized');

    const messageId = v4();

    /* Equivalent to a response */
    const cb = new Promise((resolve, reject) => {
      if (needReply) {
        /* timeout */
        const timer = setTimeout(() => {
          this.callback.delete(messageId);
          reject('timeout');
        }, 10000);

        this.callback.set(messageId, (data: MasterReplyMessageType) => {
          clearTimeout(timer);
          if (data.success) {
            resolve(data.data);
          } else {
            reject(data);
          }
        });
      } else {
        resolve('');
      }
    });

    /* Equivalent to a request */
    const sendMessage: AppSendMessageType = {
      messageId,
      apiName,
      ...this.commonConfig,
      data
    };

    window.top?.postMessage(sendMessage, this.desktopOrigin);

    return cb;
  }

  init() {
    console.log('sealos app init');
    this.commonConfig.clientLocation = window.location.origin;

    const listenCb = ({ data, origin, source }: MessageEvent<AppMessageType>) => {
      const { apiName, messageId } = data || {};
      if (!source) return;
      if (apiName && this?.apiFun[data?.apiName]) {
        return this.apiFun[data.apiName](data);
      }
      if (messageId && this.callback.has(data?.messageId)) {
        this.desktopOrigin = origin;
        // @ts-ignore nextline
        this.callback.get(data.messageId)(data);
        this.callback.delete(data?.messageId);
      }
    };

    /* add message listen to top */
    window.addEventListener('message', listenCb);

    this.initialized = true;

    return () => {
      console.log('sealos app destroy');
      window.removeEventListener('message', listenCb);
    };
  }

  getSession(): Promise<SessionV1> {
    if (this.userSession) {
      return Promise.resolve(this.userSession);
    }
    return this.sendMessageToMaster(API_NAME.USER_GET_INFO);
  }

  getLanguage(): Promise<{ lng: string }> {
    return this.sendMessageToMaster(API_NAME.GET_LANGUAGE);
  }

  /**
   * run master EventBus
   */
  runEvents(eventName: string, eventData?: any) {
    return this.sendMessageToMaster(API_NAME.EVENT_BUS, {
      eventName,
      eventData
    });
  }

  /**
   * add app event bus
   */
  addAppEventListen(name: string, fn: (e?: any) => any) {
    if (this.eventBus.has(name)) {
      console.error('event bus name repeat');
      return;
    }
    if (typeof fn !== 'function') {
      console.error('event is not a function');
      return;
    }
    this.eventBus.set(name, fn);

    return () => this.removeAppEventListen(name);
  }

  /**
   * remove app event bus
   */
  removeAppEventListen(name: string) {
    this.eventBus.delete(name);
  }

  /**
   * run app event bus
   */
  private runAppEvents(data: AppMessageType) {
    if ('eventName' in data) {
      if (!this.eventBus.has(data.eventName)) {
        console.error('event bus name does not exist');
        return;
      }
      const eventFunction = this.eventBus.get(data.eventName);
      if (eventFunction) {
        eventFunction(data.data);
      }
    }
  }
}

export let sealosApp: ClientSDK;

export const createSealosApp = () => {
  if (!isBrowser()) {
    console.error('This method need run in the browser.');
    return;
  }
  sealosApp = new ClientSDK();
  return sealosApp.init();
};
