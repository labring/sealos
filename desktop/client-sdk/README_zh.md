# Sealos Desktop SDK

## 本地调试
在 front 项目和 APP 项目 link 本地SDK：
```shell
pnpm link /desktop/client-sdk

// 断开连接
pnpm unlink /desktop/client-sdk && pnpm install

// 每次更新sdk，需要：
npm run build // 然后刷新浏览器
```

## 安装远程包

```shell
npm i sealos-desktop-sdk
```
## Master 端使用
```js
// main.ts 进行全局唯一一次实例创建.(如果是服务端渲染，这个步骤需要放到 APP.tsx 中运行)
import { initMasterSDK } from 'sealos-desktop-sdk/master';
initMasterSDK()

// APP.tsx 进行实例初始化。需要保障window存在，同时还需要传入初始化的参数
import { masterApp } from 'sealos-desktop-sdk/master';
import request from 'services/request';
useEffect(() => {
  return masterApp.init({
    session,
    request
  })
}, [session]);
```

## App 端使用

```javascript
// 入口文件 main.ts 进行初始化
import { initSealosApp } from 'sealos-desktop-sdk';

initSealosApp({
  appKey: 'appKey',
})

// 应用文件中直接使用 sealosAPP 访问.
// 注意：所有的方法都是 promise 异步的
import { sealosApp } from 'sealos-desktop-sdk';
await sealosApp.getUserInfo()
```

## 开发说明

### 增加测试 APP
在 frontend 项目中：src/mock/installedApps.ts 中追加APP，类型选择 Iframe ，地址暂填本地。

<br/>

### 增加API
1. 增加 constants/app.ts 中枚举的值。
2. 在 src/app.ts 中增加对应的执行方法。

<br/>

### Desktop 和 APP 之间的通信说明
Desktop 容器通过 Iframe 挂载APP，两者之间通过 PostMessage 进行单向通信。SDK分为 Master SDK 和 APP SDK。

Master SDK 放到了 Desktop 项目中运行，APP 开发者不需要关系 Master SDK 的内容。  

APP SDK 中，封装了和 Master SDK 通信的方法，可以直接通过 await ***() 的形式，同步的书写对应业务代码。  

**交互逻辑说明:**  
1. Desktop 中调用 Master SDK 进行初始化。给 window 对象挂载 message 监听方法。
2. APP 中调用 APP SDK 进行初始化。给 window 对象挂载监听来自 Desktop 的回调消息。  
3. APP 中调用 APP SDK 的方法，会触发一条 postMessage 信息给 Desktop。  
   1. 给每条发送的消息一个 uuid，方便接收回调。  
   2. APP SDK 有一个消息 Map ，发送消息时，会给 Map 添加一个 key 为消息 id，value 为对应响应方法。
   3. 通过 postMessage 发送消息给 Desktop。  
   4. Desktop 根据消息执行对应的方法，并把结果再次通过 postMessage 回传给 APP。
   5. APP 根据回传消息中的 id，执行Map中的响应方法。完成整个请求。


<br/>

## APP SDK 相关 API

| API | Request | Response |  Description | 
| --- | --- | --- | --- |
| init | null | {connected: true} | 初始化与 Desktop 的链接 |
| getUserInfo | null | Session Data | 获取用户的 session 数据 |
| request | { method,url,body } | any | 发送一个http请求 |
