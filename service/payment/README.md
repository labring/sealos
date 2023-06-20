# How to start

Set those envs, then start the server `go run main.go`

```shell
	WechatPrivateKey           = "WechatPrivateKey"
	MchID                      = "MchID"
	MchCertificateSerialNumber = "MchCertificateSerialNumber"
	MchAPIv3Key                = "MchAPIv3Key"
	AppID                      = "AppID"
	NotifyCallbackURL          = "CallbackURL"

```

# Get payment code-url

```shell
http://localhost:8071/payment/wechat/code-url?amount=1
```

It will return the code-url:

```shell
weixin://wxpay/bizpayurl?pr=KtwxIPhzz
```

Just convert it to QRcode, and use wechat scan to pay the fee.

The callback(notify url) is "https://sealos.io/payment/wechat/callback" by default

# CLI

```shell
go run main.go recharge --user fanux --amount 1
Use WeChat to scan the QR code below to recharge, please make sure the username and amount are correct
User: fanux
Amount: 1
```
