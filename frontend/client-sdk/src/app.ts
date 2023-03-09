import { v4 } from 'uuid';
import { API_NAME, EVENT_NAME } from "./constants";
import { isBrowser } from "./utils";
import {
  AppSendMessageType,
  MasterReplyMessageType,
  Session,
} from './types';

class ClientSDK {
  private initialized = false
  private desktopOrigin = "*"
  private commonConfig = {
    appKey: "",
    clientLocation: ""
  };

  private readonly callback = new Map<string, (data: MasterReplyMessageType) => void>()

  private sendMessageToMaster(apiName: `${API_NAME}`, data: { [key: string]: any } = {}, needReply = true): Promise<any> {
    if (!this.initialized) return Promise.reject("APP is uninitialized")

    const messageId = v4()

    /* Equivalent to a response */
    const cb = new Promise((resolve, reject) => {
      if (needReply) {
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
          }
        })
      } else {
        resolve("")
      }
    })

    /* Equivalent to a request */
    const sendMessage: AppSendMessageType = {
      messageId,
      apiName,
      ...this.commonConfig,
      data
    }

    window.top?.postMessage(sendMessage, this.desktopOrigin)

    return cb
  }

  init() {
    console.log('sealos app init')
    this.commonConfig.clientLocation = window.location.origin

    const listenCb = ({ data, origin }: MessageEvent<MasterReplyMessageType>) => {
      if (!data.messageId) return
      if (!this.callback.has(data.messageId)) return

      this.desktopOrigin = origin

      // @ts-ignore nextline
      this.callback.get(data.messageId)(data)
      this.callback.delete(data.messageId)
    }

    /* add message listen to top */
    window.addEventListener("message", listenCb)

    this.initialized = true

    return () => {
      console.log('sealos app destroy')
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

export const createSealosApp = () => {
  if (!isBrowser()) {
    console.error("This method need run in the browser.")
    return
  }
  sealosApp = new ClientSDK()
  return sealosApp.init()
}