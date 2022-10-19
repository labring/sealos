## Sealos Desktop SDK

### 安装

```shell
npm i sealos-desktop-sdk
```

### 使用 Client 端

```javascript
import ClientSDK from 'sealos-desktop-sdk';
```

### 初始化

```javascript
const sdk = new ClientSDK({
  appKey: 'this is your appKey', // 现在随便填，暂不校验
  appName: 'Mysql', // 应用名称
});
```

### sdk 相关 api
####  connect

```javascript
const isConnect = await sdk.connect();
```

### user 相关 api
#### getUserInfo
```javascript
const userInfo = await sdk.getUserInfo();
```


// TODO 系统相关 api
### 打开 app

### 关闭 app

### 安装 app

### 切换 app

// TODO
master 接收数据