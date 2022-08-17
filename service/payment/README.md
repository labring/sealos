# How to start

Set those envs, then start the server `go run main.go`

```shell
	WechatPrivateKey           = "WechatPrivateKey"
	MchID                      = "MchID"
	MchCertificateSerialNumber = "MchCertificateSerialNumber"
	MchAPIv3Key                = "MchAPIv3Key"
	AppID                      = "AppID"
	CallbackURL                = "CallbackURL"

	DefaultCallbackURL = "https://sealos.io/payment/wechat/callback"
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