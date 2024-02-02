import { NextApiRequest, NextApiResponse } from 'next';
import { addOrUpdateWechatCode } from '@/services/backend/db/wechatCode';
import crypto from 'crypto';
const xml2js = require('xml2js');

type MessageType = 'event' | 'text' | 'image';
type EventType = 'SCAN' | 'unsubscribe' | 'subscribe';
type WechatMessage = {
  ToUserName: string[];
  FromUserName: string[];
  CreateTime: number[];
  MsgType: [MessageType];
  Event: [EventType];
  EventKey: string[];
  Content: string[];
};
type WeChatRequest = {
  signature: string;
  timestamp: string;
  nonce: string;
  echostr: string;
};

function verifyWeChatRequest(req: NextApiRequest) {
  const { signature, timestamp, nonce, echostr } = req.query as WeChatRequest;
  const token = 'sealos';
  const tmpArr = [token, timestamp, nonce];
  tmpArr.sort();
  const tmpStr = tmpArr.join('');
  const encryptedStr = crypto.createHash('sha1').update(tmpStr).digest('hex');
  if (encryptedStr === signature) {
    return echostr;
  } else {
    return false;
  }
}

class WeChatEventHandler {
  private handlers: { [key in EventType]: (message: WechatMessage) => Promise<string> };
  constructor() {
    this.handlers = {
      subscribe: this.handleSubscribeEvent,
      unsubscribe: this.handleUnsubscribeEvent,
      SCAN: this.handleScanEvent
    };
  }
  async handleEvent(message: WechatMessage) {
    console.log('处理事件消息:', message);
    const eventType = message.Event[0];
    const handler = this.handlers[eventType];
    if (handler) {
      return handler(message);
    } else {
      console.log('无此事件处理方法:', eventType);
      return 'success';
    }
  }
  async handleSubscribeEvent(message: WechatMessage) {
    console.log('处理订阅事件:', message);
    if (!message?.EventKey[0]) {
      return 'fail';
    }
    const openid = message.FromUserName[0];
    const code = message.EventKey[0]?.replace('qrscene_', '');
    if (openid && code) {
      const result = await addOrUpdateWechatCode({
        openid,
        code
      });
      console.log(result);
    }
    return 'success';
  }
  async handleUnsubscribeEvent(message: WechatMessage) {
    console.log('处理取消订阅事件:', message);
    return 'success';
  }
  async handleScanEvent(message: WechatMessage) {
    console.log('处理扫描带参二维码事件:', message);
    if (!message?.EventKey[0]) {
      return 'fail';
    }
    const openid = message.FromUserName[0];
    const code = message.EventKey[0];
    if (openid && code) {
      const result = await addOrUpdateWechatCode({
        openid,
        code
      });
      console.log(result);
    }
    return 'success';
  }
}

export function textMsg(message: WechatMessage, content: string) {
  const str = `<xml>
      <ToUserName><![CDATA[${message.FromUserName}]]></ToUserName>
      <FromUserName><![CDATA[${message.ToUserName}]]></FromUserName>
      <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
      <MsgType><![CDATA[text]]></MsgType>
      <Content><![CDATA[${content}]]></Content>
    </xml>`;
  return str;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(req.body, req.method, '===\n');
    if (req.method === 'GET') {
      const str = verifyWeChatRequest(req);
      return res.send(str);
    }

    const result: { xml: WechatMessage } = await xml2js.parseStringPromise(req.body);
    let message = result.xml;
    const msgType = message.MsgType[0];

    if (msgType === 'event') {
      const eventHandler = new WeChatEventHandler();
      const result = await eventHandler.handleEvent(message);
      res.json(result);
    }
    if (msgType === 'text') {
      const result = textMsg(message, `欢迎来到公众号,收到消息=> ${message.Content[0]}`);
      res.json(result);
    }
  } catch (error) {
    console.log(error);
    res.send('success');
  }
}
