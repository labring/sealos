import { v4 } from 'uuid';
import { API_NAME, EVENT_NAME } from "./constants";
import { isBrowser } from "./utils";
import {
  AppSendMessageType,
  MasterReplyMessageType,
  Session
} from './types';

class ClientSDK {
  private initialized = false
  private commonConfig = {
    appKey: "",
    clientLocation: ""
  };

  private callback = new Map<string, (data: MasterReplyMessageType) => void>()

  constructor(config) {
    this.commonConfig = {
      appKey: config.appKey,
      clientLocation: ''
    };
  }

  sendMessageToMaster(apiName: `${API_NAME}`, data: { [key: string]: any } = {}): Promise<any> {
    if (!isBrowser()) return Promise.reject("Not in the browser")
    if (!this.initialized) return Promise.reject("APP is uninitialized")

    const messageId = v4()

    /* Equivalent to a response */
    const cb = new Promise((resolve, reject) => {
      /* timeout */
      const timer = setTimeout(() => {
        this.callback.delete(messageId)
        reject('timeout')
      }, 10000);

      this.callback.set(messageId, (data: MasterReplyMessageType) => {
        clearTimeout(timer)
        if (data.success === true) {
          resolve(data.data)
        } else {
          reject(data)
          console.error(`message fail: ${data.message}`, data)
        }
      })
    })

    /* Equivalent to a request */
    const sendMessage: AppSendMessageType = {
      messageId,
      apiName,
      ...this.commonConfig,
      data
    }

    window.top?.postMessage(sendMessage, "*")

    return cb
  }

  init() {
    console.log('sealos app init')
    this.commonConfig.clientLocation = window.location.href

    const listenCb = ({ data }: { data: MasterReplyMessageType }) => {
      if (!data.messageId) return
      if (!this.callback.has(data.messageId)) return

      // @ts-ignore nextline
      this.callback.get(data.messageId)(data)
      this.callback.delete(data.messageId)
    }

    /* add message listen to top */
    window.addEventListener("message", listenCb)

    this.initialized = true

    this.sendMessageToMaster(API_NAME.SYSTEM_CONNECT)

    return () => {
      console.log('sealos app destroy')
      this.sendMessageToMaster(API_NAME.SYSTEM_DISCONNECT)
      window.removeEventListener('message', listenCb)
    }
  }

  getUserInfo(): Promise<Session> {
    return this.sendMessageToMaster(API_NAME.USER_GET_INFO)
  }

  // test api
  getApps() {
    return this.sendMessageToMaster(API_NAME.EVENT_BUS, {
      eventName: EVENT_NAME.GET_APPS,
      eventData: "i am app, i want to get apps"
    })
  }
}

export let sealosApp: ClientSDK

export const createSealosApp = (config) => {
  sealosApp = new ClientSDK(config)
}