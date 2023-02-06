'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var uuid = require('uuid');

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
  sendMessageToMaster(apiName, data = {}) {
    var _a;
    if (!isBrowser())
      return Promise.reject("Not in the browser");
    if (!this.initialized)
      return Promise.reject("APP is uninitialized");
    const messageId = uuid.v4();
    const cb = new Promise((resolve, reject) => {
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
    });
    const sendMessage = __spreadProps(__spreadValues({
      messageId,
      apiName
    }, this.commonConfig), {
      data
    });
    (_a = window.top) == null ? void 0 : _a.postMessage(sendMessage, "*");
    return cb;
  }
  init() {
    console.log("sealos app init");
    this.commonConfig.clientLocation = window.location.href;
    const listenCb = ({ data }) => {
      if (!data.messageId)
        return;
      if (!this.callback.has(data.messageId))
        return;
      this.callback.get(data.messageId)(data);
      this.callback.delete(data.messageId);
    };
    window.addEventListener("message", listenCb);
    this.initialized = true;
    this.sendMessageToMaster(API_NAME.SYSTEM_CONNECT);
    return () => {
      console.log("sealos app destroy");
      this.sendMessageToMaster(API_NAME.SYSTEM_DISCONNECT);
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
exports.sealosApp = void 0;
const createSealosApp = (config) => {
  exports.sealosApp = new ClientSDK(config);
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
      [API_NAME.SYSTEM_CONNECT]: (data) => this.connectChild(data),
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
    var _a;
    const app = this.connectedChild.get(appKey);
    if (!app)
      return;
    (_a = app.dom.contentWindow) == null ? void 0 : _a.postMessage({
      messageId,
      success,
      message,
      data
    }, app.clientLocation || "*");
  }
  init({
    session
  }) {
    console.log("init desktop onmessage");
    this.session = session;
    const windowMessage = ({ data }) => {
      const {
        apiName,
        appKey,
        messageId
      } = data || {};
      if (!apiName || !appKey || !messageId) {
        this.replyAppMessage({
          appKey,
          messageId,
          success: false,
          message: "params error"
        });
        return;
      }
      console.log(`receive message: `, data);
      if (typeof this.apiFun[data.apiName] !== "function") {
        this.replyAppMessage({
          appKey,
          messageId,
          success: false,
          message: "function is not declare"
        });
        return;
      }
      this.apiFun[data.apiName](data);
    };
    window.addEventListener("message", windowMessage);
    this.initialized = true;
    return () => {
      window.removeEventListener("message", windowMessage);
      console.log("stop desktop onmessage");
    };
  }
  connectChild(data) {
    const { appKey, clientLocation, messageId } = data;
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
      dom,
      appKey,
      clientLocation
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
    this.replyAppMessage({
      appKey: data.appKey,
      messageId: data.messageId,
      success: true
    });
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
exports.masterApp = void 0;
const createMasterAPP = () => {
  exports.masterApp = new MasterSDK();
};

exports.API_NAME = API_NAME;
exports.EVENT_NAME = EVENT_NAME;
exports.createMasterAPP = createMasterAPP;
exports.createSealosApp = createSealosApp;
//# sourceMappingURL=index.js.map
