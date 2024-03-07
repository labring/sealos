import { API_NAME } from './constants';
import type {
  AppSendMessageType,
  MasterReplyMessageType,
  MasterSendMessageType,
  Session,
  SessionV1
} from './types';
import { isBrowser } from './utils';
import { getCookie } from './utils/cookieUtils';

class MasterSDK {
  private readonly eventBus = new Map<string, (e?: any) => any>();
  private readonly apiFun: {
    [key: string]: (data: AppSendMessageType, source: MessageEventSource, origin: string) => void;
  } = {
    [API_NAME.USER_GET_INFO]: (data, source, origin) => this.getUserInfo(data, source, origin),
    [API_NAME.EVENT_BUS]: (data, source, origin) => this.runEventBus(data, source, origin),
    [API_NAME.GET_LANGUAGE]: (data, source, origin) => this.getLanguage(data, source, origin)
  };

  constructor() {}

  private replyAppMessage({
    source,
    origin,
    messageId,
    success,
    message = '',
    data = {}
  }: MasterReplyMessageType) {
    // if not define source or source is self(Not need send message to self). Skip it
    if (!source || source === window) return;

    source.postMessage(
      {
        masterOrigin: window.location.origin,
        messageId,
        success,
        message,
        data
      },
      {
        targetOrigin: origin
      }
    );
  }

  private get session(): SessionV1 | '' {
    const sessionStr = localStorage.getItem('session');
    if (!sessionStr) return '';
    const _session = JSON.parse(sessionStr);
    const session = _session?.state?.session as Session;

    return {
      user: {
        id: session.user.userId,
        k8sUsername: session.user.k8s_username,
        name: session.user.name,
        avatar: session.user.avatar,
        nsid: session.user.nsid
      },
      token: session.token,
      kubeconfig: session.kubeconfig
    };
  }

  /**
   * run in hook
   */
  init() {
    console.log('init desktop onmessage');

    const windowMessage = ({ data, origin, source }: MessageEvent<AppSendMessageType>) => {
      const { apiName, messageId } = data || {};

      if (!source) return;
      if (!apiName || !messageId) {
        this.replyAppMessage({
          source,
          origin,
          messageId,
          success: false,
          message: 'params error'
        });
        return;
      }
      if (typeof this.apiFun[data.apiName] !== 'function') {
        this.replyAppMessage({
          source,
          origin,
          messageId,
          success: false,
          message: 'function is not declare'
        });
        return;
      }

      // window check
      console.log(`receive message: `, data, origin);

      this.apiFun[data.apiName](data, source, origin);
    };

    window.addEventListener('message', windowMessage);

    return () => {
      window.removeEventListener('message', windowMessage);
      console.log('stop desktop onmessage');
    };
  }

  /**
   * add event bus
   */
  addEventListen(name: string, fn: (e?: any) => any) {
    if (this.eventBus.has(name)) {
      console.error('event bus name repeat');
      return;
    }
    if (typeof fn !== 'function') {
      console.error('event is not a function');
      return;
    }
    this.eventBus.set(name, fn);

    return () => this.removeEventListen(name);
  }

  /**
   * remove event bus
   */
  removeEventListen(name: string) {
    this.eventBus.delete(name);
  }

  /**
   * run event bus function
   */
  private async runEventBus(data: AppSendMessageType, source: MessageEventSource, origin: string) {
    const {
      messageId,
      data: { eventName, eventData }
    } = data;
    if (!this.eventBus.has(eventName)) {
      return this.replyAppMessage({
        source,
        origin,
        messageId,
        success: false,
        message: 'event is not register'
      });
    }
    const res = await this.eventBus.get(eventName)?.(eventData);
    this.replyAppMessage({
      source,
      origin,
      messageId,
      success: true,
      data: res || {}
    });
  }

  /**
   * return session to app
   */
  private getUserInfo(data: AppSendMessageType, source: MessageEventSource, origin: string) {
    if (this.session) {
      this.replyAppMessage({
        source,
        origin,
        messageId: data.messageId,
        success: true,
        data: this.session
      });
    } else {
      this.replyAppMessage({
        source,
        origin,
        messageId: data.messageId,
        success: false,
        message: 'no login in'
      });
    }
  }

  /**
   * return desktop  language
   */
  private getLanguage(data: AppSendMessageType, source: MessageEventSource, origin: string) {
    if (this.session) {
      this.replyAppMessage({
        source,
        origin,
        messageId: data.messageId,
        success: true,
        data: {
          lng: getCookie('NEXT_LOCALE') || 'zh'
        }
      });
    } else {
      this.replyAppMessage({
        source,
        origin,
        messageId: data.messageId,
        success: false,
        message: 'no login in'
      });
    }
  }

  /**
   * send message to all app
   */
  sendMessageToAll(data: MasterSendMessageType) {
    const iframes = document.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      iframe.contentWindow?.postMessage(data, iframe?.src);
    }
  }
}

export let masterApp: MasterSDK;

export const createMasterAPP = () => {
  if (!isBrowser()) {
    console.error('This method need run in the browser.');
    return;
  }
  masterApp = new MasterSDK();

  return masterApp.init();
};
