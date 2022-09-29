## Sealos Desktop SDK

### 初始化

```javascript
const sdk = new ClientSDK({
  appKey: 'this is your appKey', // 现在随便填，暂不校验
  appName: 'Mysql', // 应用名称
});
```

### system 相关 api
####  connect
```javascript
const isConnect = await sdk.connect();
```

### user 相关 api
#### getUserInfo
```javascript
const userInfo = await sdk.getUserInfo();
```