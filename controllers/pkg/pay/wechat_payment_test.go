package pay

import (
	"fmt"
	"github.com/labring/sealos/controllers/pkg/account"
	"log"
	"os"
	"testing"
	"time"
)

func setupEnv_wechatPayment() {
	// 微信支付的环境变量配置
	const (
		envWechatPrivateKey           = ""
		envMchID                      = ""
		envMchCertificateSerialNumber = ""
		envMchAPIv3Key                = ""
		envAppID                      = ""
		//envNotifyCallbackURL          = "your_notify_callback_url_here"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          // 替换为你的支付通知回调URL
	)

	// 检查环境变量是否已设置
	if os.Getenv(MchID) == "" {
		err := os.Setenv(MchID, envMchID)
		if err != nil {
			log.Fatalf("Failed to set the environment variable of WeChat merchant account: %v", err)
		}
	}
	if os.Getenv(WechatPrivateKey) == "" {
		err := os.Setenv(WechatPrivateKey, envWechatPrivateKey)
		if err != nil {
			log.Fatalf("Failed to set the environment variable for WeChat private key: %v", err)
		}
	}
	if os.Getenv(MchCertificateSerialNumber) == "" {
		err := os.Setenv(MchCertificateSerialNumber, envMchCertificateSerialNumber)
		if err != nil {
			log.Fatalf("Failed to set the environment variable of the serial number of the WeChat merchant certificate: %v", err)
		}
	}
	if os.Getenv(MchAPIv3Key) == "" {
		err := os.Setenv(MchAPIv3Key, envMchAPIv3Key)
		if err != nil {
			log.Fatalf("Failed to set the environment variable of the WeChat API v3 key: %v", err)
		}
	}
	if os.Getenv(AppID) == "" {
		err := os.Setenv(AppID, envAppID)
		if err != nil {
			log.Fatalf("Failed to set the WeChat AppID environment variable: %v", err)
		}
	}

	// 沙盒环境
	err := os.Setenv(account.PayIsProduction, "true")
	if err != nil {
		return
	}
}

func TestWechatPayment_PaymentAndRefund(t *testing.T) {
	setupEnv_wechatPayment()
	// 初始化微信支付对象
	wechatPayment := WechatPayment{}

	user := "test_user"
	amount := int64(10000) // 支付金额，单位为“分”，例如10000分 = 100元
	describe := "test_payouts"

	// 创建支付订单
	tradeNo, codeURL, err := wechatPayment.CreatePayment(amount, user, describe)
	if err != nil {
		t.Fatalf("failed to create a payment order: %v", err)
	}

	// 打印支付订单信息
	fmt.Printf("the payment order has been created successfully\n")
	fmt.Printf("merchant order number %s\n", tradeNo)
	fmt.Printf("payment qr code link %s\n", codeURL)

	time.Sleep(40 * time.Second)

	// 查询支付订单状态
	status, paidAmount, err := wechatPayment.GetPaymentDetails(tradeNo)
	if err != nil {
		t.Fatalf("failed to query the payment order: %v", err)
	}

	// 打印支付订单状态
	fmt.Printf("payment order status: %s\n", status)
	fmt.Printf("payment amount %d cent\n", paidAmount)

	// 判断支付是否成功
	//if status != StatusSuccess {
	//	t.Fatalf("The payment was unsuccessful and no refund can be made")
	//}

	// 进行退款操作
	refundOption := RefundOption{
		TradeNo: tradeNo,
		OrderID: tradeNo, // 可以设置为与订单号相同
		Amount:  amount,  // 退款金额
	}

	// 调用退款方法
	refundNo, refundID, err := wechatPayment.RefundPayment(refundOption)
	if err != nil {
		t.Fatalf("refund failed: %v", err)
	}

	// 打印退款信息
	fmt.Printf("the refund was successful！\n")
	fmt.Printf("merchant refund number: %s\n", refundNo)
	fmt.Printf("wechat refund number: %s\n", refundID)
}
