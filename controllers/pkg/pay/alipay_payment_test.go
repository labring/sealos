package pay

import (
	"github.com/labring/sealos/controllers/pkg/account"
	"os"
	"time"

	//"strings"
	"testing"
)

func setupEnv_alipay() {
	const (
		envAppID            = ""
		envPrivateKey       = ""
		envAppCertPublicKey = ""
		envRootCert         = ""
		envCertPublicKey    = ""
	)

	// 下面只有当这些变量都未被预先设置时才写入
	if os.Getenv(account.AlipayAppID) == "" {
		err := os.Setenv(account.AlipayAppID, envAppID)
		if err != nil {
			return
		}
	}
	if os.Getenv(account.AlipayPrivateKey) == "" {
		err := os.Setenv(account.AlipayPrivateKey, envPrivateKey)
		if err != nil {
			return
		}
	}
	if os.Getenv(account.AlipayAppCertPublicKey) == "" {
		err := os.Setenv(account.AlipayAppCertPublicKey, envAppCertPublicKey)
		if err != nil {
			return
		}
	}
	if os.Getenv(account.AlipayRootCert) == "" {
		err := os.Setenv(account.AlipayRootCert, envRootCert)
		if err != nil {
			return
		}
	}
	if os.Getenv(account.AlipayCertPublicKey) == "" {
		err := os.Setenv(account.AlipayCertPublicKey, envCertPublicKey)
		if err != nil {
			return
		}
	}
	// 沙盒环境
	err := os.Setenv(account.PayIsProduction, "true")
	if err != nil {
		return
	}
}

// TestCreatePaymentIntegration 测试支付创建
func TestCreatePaymentIntegration(t *testing.T) {
	ap, err := NewAlipayPayment()
	if err != nil {
		t.Skipf("Skip test: NewAlipayPayment failed, possibly because the sandbox was not fully configured：%v", err)
	}
	// 下单 1 元
	tradeNo, qrURL, err := ap.CreatePayment(1_000_000, "test-user", "单元测试创建支付")
	if err != nil {
		t.Fatalf("CreatePayment() failed: %v", err)
	}
	t.Logf("CreatePayment success: tradeNo=%s, qrURL=%s", tradeNo, qrURL)
}

// 完整 E2E 测试：支付→查询→退款
func TestSandbox_EndToEnd(t *testing.T) {
	setupEnv_alipay()
	ap, err := NewAlipayPayment()
	if err != nil {
		t.Fatalf("NewAlipayPayment() failed: %v", err)
	}

	// 下单
	const amount = 20_000
	outTradeNo, qrURL, err := ap.CreatePayment(amount, "sandbox-user", "sandbox_environment_testing")
	if err != nil {
		t.Fatalf("CreatePayment() failed: %v", err)
	}
	t.Logf("the order was successfully placed：outTradeNo=%s, qrURL=%s", outTradeNo, qrURL)

	t.Log("the simulated payment is complete")

	time.Sleep(30 * time.Second)

	// 查询支付状态
	status, _, err := ap.GetPaymentDetails(outTradeNo)
	if err != nil {
		t.Fatalf("GetPaymentDetails() failed: %v", err)
	}
	if status != PaymentSuccess {
		t.Fatalf("expected status %s, got %s", PaymentSuccess, status)
	}
	t.Logf("payment status：%s", status)

	// 退款流程
	refundNo, refundFee, err := ap.RefundPayment(RefundOption{
		OrderID: "sandbox-order-001",
		TradeNo: outTradeNo,
		Amount:  0.7 * amount,
	})
	if err != nil {
		t.Fatalf("RefundPayment() failed: %v", err)
	}
	t.Logf("the refund was successful：refundNo=%s, refundFee=%s", refundNo, refundFee)
}
