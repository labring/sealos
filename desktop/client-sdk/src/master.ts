import type {
  MasterReplyMessageType,
  AppSendMessageType,
  TChild,
  Session
} from "./types";
import { isIFrame } from './utils';
import { API_NAME } from "./constants";

class MasterSDK {
  private initialized = false
  private readonly connectedChild = new Map<string, TChild>()
  private readonly eventBus = new Map<string, (e?: any) => { [key: string]: any } | void>()
  private readonly apiFun: ({ [key: string]: (data: AppSendMessageType) => void }) = {
    [API_NAME.SYSTEM_CONNECT]: (data) => this.connectChild(data),
    [API_NAME.USER_GET_INFO]: (data) => this.getUserInfo(data),
    [API_NAME.SYSTEM_DISCONNECT]: (data) => this.disconnectChild(data),
    [API_NAME.EVENT_BUS]: (data) => this.runEventBus(data)
  }
  private session?: Session

  constructor() { }

  replyAppMessage({
    appKey,
    messageId,
    success,
    message = '',
    data = {}
  }: MasterReplyMessageType) {
    const app = this.connectedChild.get(appKey)
    if (!app) return

    // @ts-ignore nextline
    app.dom.contentWindow?.postMessage({
      messageId,
      success,
      message,
      data
    }, app.clientLocation || "*")
  }

  /**
   * run in hook
   */
  init({
    session,
  }: {
    session: Session,
  }) {
    console.log("init desktop onmessage");
    /* store master obj */
    this.session = session;

    const windowMessage = ({ data }: { data: AppSendMessageType }) => {
      const {
        apiName,
        appKey,
        messageId,
      } = data || {};

      if (!apiName || !appKey || !messageId) {
        this.replyAppMessage({
          appKey,
          messageId,
          success: false,
          message: "params error",
        })
        return
      }

      console.log(`receive message: `, data)

      if (typeof this.apiFun[data.apiName] !== 'function') {
        this.replyAppMessage({
          appKey,
          messageId,
          success: false,
          message: "function is not declare",
        })
        return
      }

      /* app auth check */

      this.apiFun[data.apiName](data)
    }

    window.addEventListener("message", windowMessage);

    this.initialized = true

    return () => {
      window.removeEventListener("message", windowMessage);
      console.log('stop desktop onmessage')
    };
  }

  /**
   * init connect. add user to cache
   */
  connectChild(data: AppSendMessageType) {
    const { appKey, clientLocation, messageId } = data
    const dom = window.document.getElementById("app-window-" + appKey);
    if (!isIFrame(dom)) {
      this.replyAppMessage({
        appKey,
        messageId,
        success: false,
        message: "Invalid connection",
      })
      return
    }

    this.connectedChild.set(appKey, {
      dom,
      appKey,
      clientLocation,
    });

    console.log(`connect app`, this.connectedChild.get(appKey));
    this.replyAppMessage({
      appKey,
      messageId,
      success: true,
      data: {
        connected: true
      }
    })
  }

  disconnectChild(data: AppSendMessageType) {
    const { appKey } = data
    this.connectedChild.delete(appKey)
    this.replyAppMessage({
      appKey: data.appKey,
      messageId: data.messageId,
      success: true
    })

    console.log(this.connectedChild, 'disconnect');
  }

  /**
   * add event bus
   */
  addEventListen(name: string, fn: (e?: any) => { [key: string]: any }) {
    if (this.eventBus.has(name)) {
      console.error("event bus name repeat")
      return
    }
    if (typeof fn !== 'function') {
      console.error("event is not a function")
      return
    }
    this.eventBus.set(name, fn)
  }

  /**
   * run event bus function
   */
  async runEventBus(data: AppSendMessageType) {
    const { appKey, messageId, data: { eventName, eventData } } = data
    if (!this.eventBus.has(eventName)) {
      this.replyAppMessage({
        appKey,
        messageId,
        success: false,
        message: "event is not register"
      })
    } else {
      // @ts-ignore nextline
      const res = await this.eventBus.get(eventName)(eventData)
      this.replyAppMessage({
        appKey,
        messageId,
        success: true,
        data: res || {}
      })
    }
  }

  getUserInfo(data: AppSendMessageType) {
    if (this.session) {
      this.replyAppMessage({
        appKey: data.appKey,
        messageId: data.messageId,
        success: true,
        data: this.session
      })
    } else {
      this.replyAppMessage({
        appKey: data.appKey,
        messageId: data.messageId,
        success: false,
        message: "请先未登录"
      })
    }
  }
}

export let masterApp: MasterSDK

export const createMasterAPP = () => {
  masterApp = new MasterSDK()
}

export default MasterSDK;
