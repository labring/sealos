# Sealos Desktop SDK

## 本地调试

1. 全局安装 yalc

```bash
npm i -g yalc
npm i -g nodemon
```

2. 在 client-sdk 项目目录下执行:

```bash
npm run dev
```

3. 在 front 项目或者 APP 项目 link 本地 SDK：

```bash
## 连接本地包
rm -rf node_modules/sealos-desktop-sdk && yalc link sealos-desktop-sdk

## 断开连接
yalc remove --all && pnpm install sealos-desktop-sdk

## 已经集成了指令：
npm run link-sdk
npm run unlink-sdk
```

4. 重启 front 项目或者 APP 项目

5. 开发 SDK ，保存后自动重新构建。结束后，需要手动执行断开连接

## 安装远程包

```bash
pnpm i sealos-desktop-sdk
```

## 使用教程

sealos-desktop-sdk 分为 Master 和 APP ，除了 Desktop 项目使用 Master 外，其他项目只需要使用 APP 的内容。  
sealos-desktop-sdk 封装了一套基于 postMessage 的 Iframe 和基座的通信方法，APP 中可以同步的写法去调用基座的方法。  
不管是 Master 还是 APP，都需要在一个入口文件执行一次初始化，挂载 listener，这意味着必须在 Browser 环境中运行。

```js
// Desktop 项目中
import { createMasterAPP } from 'sealos-desktop-sdk/master';

...

useEffect(() => {
  return createMasterAPP({
    session
  });
}, [session]);

...


// APP 项目中
import { createSealosApp } from "sealos-desktop-sdk";

...

useEffect(() => {
  return createSealosApp({
    appKey: "sealos-app-sdk-demo",
  });
}, []);

...
```

## 开发说明

SDK 设计文档: [SDK Design](https://doc.weixin.qq.com/doc/w3_Aa0APAbqAE0qKaX1SKeSeOTK2Rr88?scode=AIgAzwcKAEIHXk0OZLAa0APAbqAE0)

### 增加测试 APP

在 frontend 项目中：src/mock/installedApps.ts 中追加 APP，类型选择 Iframe ，地址暂填本地。

<br/>

### 增加 API

1. 增加 constants/app.ts 中枚举的值。
2. 在 src/app.ts 中增加对应的执行方法。

<br/>

### Desktop 和 APP 之间的通信说明

Desktop 容器通过 Iframe 挂载 APP，两者之间通过 PostMessage 进行单向通信。SDK 分为 Master SDK 和 APP SDK。

Master SDK 放到了 Desktop 项目中运行，APP 开发者不需要关心 Master SDK 的内容。

APP SDK 中，封装了和 Master SDK 通信的方法，可以直接通过 await \*\*\*() 的形式，同步的书写对应业务代码。

**交互逻辑说明:**

1. Desktop 中调用 Master SDK 进行初始化。给 window 对象挂载 message 监听方法。
2. APP 中调用 APP SDK 进行初始化。给 window 对象挂载监听来自 Desktop 的回调消息。
3. APP 中调用 APP SDK 的方法，会触发一条 postMessage 信息给 Desktop。
   1. 给每条发送的消息一个 uuid，方便接收回调。
   2. APP SDK 有一个消息 Map ，发送消息时，会给 Map 添加一个 key 为消息 id，value 为对应响应方法。
   3. 通过 postMessage 发送消息给 Desktop。
   4. Desktop 根据消息执行对应的方法，并把结果再次通过 postMessage 回传给 APP。
   5. APP 根据回传消息中的 id，执行 Map 中的响应方法。完成整个请求。

<br/>

## APP SDK 相关 API

| API         | Request             | Response          | Description             |
| ----------- | ------------------- | ----------------- | ----------------------- |
| init        | null                | {connected: true} | 初始化与 Desktop 的链接 |
| getUserInfo | null                | Session Data      | 获取用户的 session 数据 |
| request     | { method,url,body } | any               | 发送一个 http 请求      |
