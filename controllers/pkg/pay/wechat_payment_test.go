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
		envMchID                      = "" // 替换为你的商户号
		envMchCertificateSerialNumber = "" // 替换为你的商户证书序列号
		envMchAPIv3Key                = "" // 替换为你的商户APIv3密钥
		envAppID                      = "" // 替换为你的App ID
		//envNotifyCallbackURL          = "your_notify_callback_url_here"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          // 替换为你的支付通知回调URL
	)

	// 检查环境变量是否已设置
	if os.Getenv(MchID) == "" {
		err := os.Setenv(MchID, envMchID)
		if err != nil {
			log.Fatalf("设置微信商户号环境变量失败: %v", err)
		}
	}
	if os.Getenv(WechatPrivateKey) == "" {
		err := os.Setenv(WechatPrivateKey, envWechatPrivateKey)
		if err != nil {
			log.Fatalf("设置微信私钥环境变量失败: %v", err)
		}
	}
	if os.Getenv(MchCertificateSerialNumber) == "" {
		err := os.Setenv(MchCertificateSerialNumber, envMchCertificateSerialNumber)
		if err != nil {
			log.Fatalf("设置微信商户证书序列号环境变量失败: %v", err)
		}
	}
	if os.Getenv(MchAPIv3Key) == "" {
		err := os.Setenv(MchAPIv3Key, envMchAPIv3Key)
		if err != nil {
			log.Fatalf("设置微信APIv3密钥环境变量失败: %v", err)
		}
	}
	if os.Getenv(AppID) == "" {
		err := os.Setenv(AppID, envAppID)
		if err != nil {
			log.Fatalf("设置微信AppID环境变量失败: %v", err)
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

	// 测试数据 - 请替换为实际的用户信息和支付金额
	user := "test_user"    // 用户标识
	amount := int64(10000) // 支付金额，单位为“分”，例如10000分 = 100元
	describe := "测试支付"     // 支付描述

	// 1. 创建支付订单
	tradeNo, codeURL, err := wechatPayment.CreatePayment(amount, user, describe)
	if err != nil {
		t.Fatalf("创建支付订单失败: %v", err)
	}

	// 打印支付订单信息
	fmt.Printf("支付订单创建成功！\n")
	fmt.Printf("商户订单号: %s\n", tradeNo)
	fmt.Printf("支付二维码链接: %s\n", codeURL)

	time.Sleep(40 * time.Second)

	// 2. 查询支付订单状态
	status, paidAmount, err := wechatPayment.GetPaymentDetails(tradeNo)
	if err != nil {
		t.Fatalf("查询支付订单失败: %v", err)
	}

	// 打印支付订单状态
	fmt.Printf("支付订单状态: %s\n", status)
	fmt.Printf("支付金额: %d 分\n", paidAmount)

	// 判断支付是否成功
	//if status != StatusSuccess {
	//	t.Fatalf("支付未成功，无法进行退款")
	//}

	// 3. 进行退款操作
	refundOption := RefundOption{
		TradeNo: tradeNo,
		OrderID: tradeNo, // 可以设置为与订单号相同
		Amount:  amount,  // 退款金额
	}

	// 调用退款方法
	refundNo, refundID, err := wechatPayment.RefundPayment(refundOption)
	if err != nil {
		t.Fatalf("退款失败: %v", err)
	}

	// 打印退款信息
	fmt.Printf("退款成功！\n")
	fmt.Printf("商户退款单号: %s\n", refundNo)
	fmt.Printf("微信退款单号: %s\n", refundID)
}
