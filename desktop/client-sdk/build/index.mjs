import { v4 } from 'uuid';

var API_NAME = /* @__PURE__ */ ((API_NAME2) => {
  API_NAME2["SYSTEM_CONNECT"] = "system.connect";
  API_NAME2["SYSTEM_DISCONNECT"] = "system.disconnect";
  API_NAME2["USER_GET_INFO"] = "user.getInfo";
  API_NAME2["EVENT_BUS"] = "event-bus";
  return API_NAME2;
})(API_NAME || {});

var EVENT_NAME = /* @__PURE__ */ ((EVENT_NAME2) => {
  EVENT_NAME2["GET_APPS"] = "get-apps";
  return EVENT_NAME2;
})(EVENT_NAME || {});

const isBrowser = () => typeof window !== "undefined";
const isIFrame = (input) => input !== null && input.tagName === "IFRAME";

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
class ClientSDK {
  constructor(config) {
    this.initialized = false;
    this.desktopOrigin = "*";
    this.commonConfig = {
      appKey: "",
      clientLocation: ""
    };
    this.callback = /* @__PURE__ */ new Map();
    this.commonConfig = {
      appKey: config.appKey,
      clientLocation: ""
    };
  }
  sendMessageToMaster(apiName, data = {}, needReply = true) {
    var _a;
    if (!this.initialized)
      return Promise.reject("APP is uninitialized");
    const messageId = v4();
    const cb = new Promise((resolve, reject) => {
      if (needReply) {
        const timer = setTimeout(() => {
          this.callback.delete(messageId);
          reject("timeout");
        }, 1e4);
        this.callback.set(messageId, (data2) => {
          clearTimeout(timer);
          if (data2.success === true) {
            resolve(data2.data);
          } else {
            reject(data2);
            console.error(`message fail: ${data2.message}`, data2);
          }
        });
      } else {
        resolve("");
      }
    });
    const sendMessage = __spreadProps(__spreadValues({
      messageId,
      apiName
    }, this.commonConfig), {
      data
    });
    (_a = window.top) == null ? void 0 : _a.postMessage(sendMessage, this.desktopOrigin);
    return cb;
  }
  init() {
    console.log("sealos app init");
    this.commonConfig.clientLocation = window.location.origin;
    const listenCb = ({ data, origin }) => {
      if (!data.messageId)
        return;
      if (!this.callback.has(data.messageId))
        return;
      this.desktopOrigin = origin;
      this.callback.get(data.messageId)(data);
      this.callback.delete(data.messageId);
    };
    window.addEventListener("message", listenCb);
    this.initialized = true;
    this.sendMessageToMaster(API_NAME.SYSTEM_CONNECT);
    return () => {
      console.log("sealos app destroy");
      this.sendMessageToMaster(API_NAME.SYSTEM_DISCONNECT, {}, false);
      window.removeEventListener("message", listenCb);
    };
  }
  getUserInfo() {
    return this.sendMessageToMaster(API_NAME.USER_GET_INFO);
  }
  getApps() {
    return this.sendMessageToMaster(API_NAME.EVENT_BUS, {
      eventName: EVENT_NAME.GET_APPS,
      eventData: "i am app, i want to get apps"
    });
  }
}
let sealosApp;
const createSealosApp = (config) => {
  if (!isBrowser()) {
    console.error("This method need run in the browser.");
    return;
  }
  sealosApp = new ClientSDK(config);
  return sealosApp.init();
};

var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
class MasterSDK {
  constructor() {
    this.initialized = false;
    this.connectedChild = /* @__PURE__ */ new Map();
    this.eventBus = /* @__PURE__ */ new Map();
    this.apiFun = {
      [API_NAME.SYSTEM_CONNECT]: () => {
      },
      [API_NAME.USER_GET_INFO]: (data) => this.getUserInfo(data),
      [API_NAME.SYSTEM_DISCONNECT]: (data) => this.disconnectChild(data),
      [API_NAME.EVENT_BUS]: (data) => this.runEventBus(data)
    };
  }
  replyAppMessage({
    appKey,
    messageId,
    success,
    message = "",
    data = {}
  }) {
    const app = this.connectedChild.get(appKey);
    if (!app)
      return;
    app.source.postMessage({
      messageId,
      success,
      message,
      data
    }, {
      targetOrigin: app.clientLocation
    });
  }
  init({
    session
  }) {
    console.log("init desktop onmessage");
    this.session = session;
    const windowMessage = ({
      data,
      origin,
      source
    }) => {
      const {
        apiName,
        appKey,
        messageId
      } = data || {};
      if (!apiName || !appKey || !messageId || !source) {
        this.replyAppMessage({
          appKey,
          messageId,
          success: false,
          message: "params error"
        });
        return;
      }
      if (typeof this.apiFun[data.apiName] !== "function") {
        this.replyAppMessage({
          appKey,
          messageId,
          success: false,
          message: "function is not declare"
        });
        return;
      }
      console.log(`receive message: `, data);
      if (data.apiName === API_NAME.SYSTEM_CONNECT) {
        this.connectChild(data, origin, source);
      } else {
        this.apiFun[data.apiName](data);
      }
    };
    window.addEventListener("message", windowMessage);
    this.initialized = true;
    return () => {
      window.removeEventListener("message", windowMessage);
      console.log("stop desktop onmessage");
    };
  }
  connectChild(data, origin, source) {
    const { appKey, messageId } = data;
    const dom = window.document.getElementById("app-window-" + appKey);
    if (!isIFrame(dom)) {
      this.replyAppMessage({
        appKey,
        messageId,
        success: false,
        message: "Invalid connection"
      });
      return;
    }
    this.connectedChild.set(appKey, {
      source,
      appKey,
      clientLocation: origin
    });
    console.log(`connect app`, this.connectedChild.get(appKey));
    this.replyAppMessage({
      appKey,
      messageId,
      success: true,
      data: {
        connected: true
      }
    });
  }
  disconnectChild(data) {
    const { appKey } = data;
    this.connectedChild.delete(appKey);
    console.log(this.connectedChild, "disconnect");
  }
  addEventListen(name, fn) {
    if (this.eventBus.has(name)) {
      console.error("event bus name repeat");
      return;
    }
    if (typeof fn !== "function") {
      console.error("event is not a function");
      return;
    }
    this.eventBus.set(name, fn);
  }
  runEventBus(data) {
    return __async(this, null, function* () {
      const { appKey, messageId, data: { eventName, eventData } } = data;
      if (!this.eventBus.has(eventName)) {
        this.replyAppMessage({
          appKey,
          messageId,
          success: false,
          message: "event is not register"
        });
      } else {
        const res = yield this.eventBus.get(eventName)(eventData);
        this.replyAppMessage({
          appKey,
          messageId,
          success: true,
          data: res || {}
        });
      }
    });
  }
  getUserInfo(data) {
    if (this.session) {
      this.replyAppMessage({
        appKey: data.appKey,
        messageId: data.messageId,
        success: true,
        data: this.session
      });
    } else {
      this.replyAppMessage({
        appKey: data.appKey,
        messageId: data.messageId,
        success: false,
        message: "\u8BF7\u5148\u672A\u767B\u5F55"
      });
    }
  }
}
let masterApp;
const createMasterAPP = (config) => {
  if (!isBrowser()) {
    console.error("This method need run in the browser.");
    return;
  }
  masterApp = new MasterSDK();
  return masterApp.init(config);
};

export { API_NAME, EVENT_NAME, createMasterAPP, createSealosApp, masterApp, sealosApp };
//# sourceMappingURL=index.mjs.map
