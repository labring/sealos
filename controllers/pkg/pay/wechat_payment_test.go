package pay

import (
	"fmt"
	"log"
	"os"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/account"
)

func setupenvWechatpayment() {
	// configure the environment variables of wechat pay
	const (
		envWechatPrivateKey           = ""
		envMchID                      = ""
		envMchCertificateSerialNumber = ""
		envMchAPIv3Key                = ""
		envAppID                      = ""
		//envNotifyCallbackURL          = "your_notify_callback_url_here"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          // 替换为你的支付通知回调URL
	)

	// check that the environment variables are set
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

	// sandboxEnvironment
	err := os.Setenv(account.PayIsProduction, "true")
	if err != nil {
		return
	}
}

func TestWechatPayment_PaymentAndRefund(t *testing.T) {
	setupenvWechatpayment()
	// initialize the wechat pay object
	wechatPayment := WechatPayment{}

	user := "test_user"
	amount := int64(10000) // The amount to be paid is in "cents", e.g. 10,000 cents = 100 RMB
	describe := "test_payouts"

	// create a payment order
	tradeNo, codeURL, err := wechatPayment.CreatePayment(amount, user, describe)
	if err != nil {
		t.Fatalf("failed to create a payment order: %v", err)
	}

	// print the payment order information
	fmt.Printf("the payment order has been created successfully\n")
	fmt.Printf("merchant order number %s\n", tradeNo)
	fmt.Printf("payment qr code link %s\n", codeURL)

	time.Sleep(40 * time.Second)

	// check the status of your payment order
	status, paidAmount, err := wechatPayment.GetPaymentDetails(tradeNo)
	if err != nil {
		t.Fatalf("failed to query the payment order: %v", err)
	}

	// print the status of the payment order
	fmt.Printf("payment order status: %s\n", status)
	fmt.Printf("payment amount %d cent\n", paidAmount)

	// determine whether the payment was successful
	//if status != StatusSuccess {
	//	t.Fatalf("The payment was unsuccessful and no refund can be made")
	//}

	// make a refund
	refundOption := RefundOption{
		TradeNo: tradeNo,
		OrderID: tradeNo, // can be set to be the same as the order number
		Amount:  amount,  // refund amount
	}

	// invoke the refund method
	refundNo, refundID, err := wechatPayment.RefundPayment(refundOption)
	if err != nil {
		t.Fatalf("refund failed: %v", err)
	}

	// print the refund information
	fmt.Printf("the refund was successful！\n")
	fmt.Printf("merchant refund number: %s\n", refundNo)
	fmt.Printf("wechat refund number: %s\n", refundID)
}
