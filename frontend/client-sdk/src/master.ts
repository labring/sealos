import type {
  MasterReplyMessageType,
  AppSendMessageType,
  Session,
} from "./types";
import { isBrowser } from './utils';
import { API_NAME } from "./constants";

class MasterSDK {
  private initialized = false
  private readonly eventBus = new Map<string, (e?: any) => { [key: string]: any } | void>()
  private readonly apiFun: ({ [key: string]: (data: AppSendMessageType, source: MessageEventSource, origin: string) => void }) = {
    [API_NAME.USER_GET_INFO]: (data, source, origin) => this.getUserInfo(data, source, origin),
    [API_NAME.EVENT_BUS]: (data, source, origin) => this.runEventBus(data, source, origin)
  }

  constructor() { }

  private replyAppMessage({
    source,
    origin,
    messageId,
    success,
    message = '',
    data = {}
  }: MasterReplyMessageType) {
    if (!source) return

    source.postMessage({
      messageId,
      success,
      message,
      data
    }, {
      targetOrigin: origin
    })
  }

  private get session() {
    const sessionStr = localStorage.getItem('session')
    if (!sessionStr) return ''
    const session = JSON.parse(sessionStr)

    return session?.state?.session as Session
  }

  /**
   * run in hook
   */
  init() {
    console.log("init desktop onmessage");

    const windowMessage = ({
      data,
      origin,
      source
    }: MessageEvent<AppSendMessageType>) => {
      const {
        apiName,
        messageId,
      } = data || {};

      if (!source) return
      if (!apiName || !messageId) {
        this.replyAppMessage({
          source,
          origin,
          messageId,
          success: false,
          message: "params error",
        })
        return
      }
      if (typeof this.apiFun[data.apiName] !== 'function') {
        this.replyAppMessage({
          source,
          origin,
          messageId,
          success: false,
          message: "function is not declare",
        })
        return
      }

      // window check
      console.log(`receive message: `, data, origin)

      this.apiFun[data.apiName](data, source, origin)
    }

    window.addEventListener("message", windowMessage);

    this.initialized = true

    return () => {
      window.removeEventListener("message", windowMessage);
      console.log('stop desktop onmessage')
    };
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
  private async runEventBus(data: AppSendMessageType, source: MessageEventSource, origin: string) {
    const { messageId, data: { eventName, eventData } } = data
    if (!this.eventBus.has(eventName)) {
      this.replyAppMessage({
        source,
        origin,
        messageId,
        success: false,
        message: "event is not register"
      })
    } else {
      // @ts-ignore nextline
      const res = await this.eventBus.get(eventName)(eventData)
      this.replyAppMessage({
        source,
        origin,
        messageId,
        success: true,
        data: res || {}
      })
    }
  }

  private getUserInfo(data: AppSendMessageType, source: MessageEventSource, origin: string) {
    if (this.session) {
      this.replyAppMessage({
        source,
        origin,
        messageId: data.messageId,
        success: true,
        data: this.session
      })
    } else {
      this.replyAppMessage({
        source,
        origin,
        messageId: data.messageId,
        success: false,
        message: "请先未登录"
      })
    }
  }
}

export let masterApp: MasterSDK

export const createMasterAPP = () => {
  if (!isBrowser()) {
    console.error("This method need run in the browser.")
    return
  }
  masterApp = new MasterSDK()

  return masterApp.init()
}
