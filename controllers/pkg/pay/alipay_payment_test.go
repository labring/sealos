package pay

import (
	"os"
	"time"

	"github.com/labring/sealos/controllers/pkg/account"

	"testing"
)

func setupenvAlipay() {
	const (
		envAppID            = ""
		envPrivateKey       = ""
		envAppCertPublicKey = ""
		envRootCert         = ""
		envCertPublicKey    = ""
	)

	// The following is only written if none of these variables are preset
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
	// sandboxEnvironment
	err := os.Setenv(account.PayIsProduction, "true")
	if err != nil {
		return
	}
}

// TestCreatePaymentIntegration test payment creation
func TestCreatePaymentIntegration(t *testing.T) {
	ap, err := NewAlipayPayment()
	if err != nil {
		t.Skipf("Skip test: NewAlipayPayment failed, possibly because the sandbox was not fully configured：%v", err)
	}
	// place an order of $1
	tradeNo, qrURL, err := ap.CreatePayment(1_000_000, "test-user", "unit tests create payments")
	if err != nil {
		t.Fatalf("CreatePayment() failed: %v", err)
	}
	t.Logf("CreatePayment success: tradeNo=%s, qrURL=%s", tradeNo, qrURL)
}

// Full E2E Test: Payment → Inquiries → Refunds
func TestSandbox_EndToEnd(t *testing.T) {
	setupenvAlipay()
	ap, err := NewAlipayPayment()
	if err != nil {
		t.Fatalf("NewAlipayPayment() failed: %v", err)
	}

	// place an order
	const amount = 20_000
	outTradeNo, qrURL, err := ap.CreatePayment(amount, "sandbox-user", "sandbox_environment_testing")
	if err != nil {
		t.Fatalf("CreatePayment() failed: %v", err)
	}
	t.Logf("the order was successfully placed：outTradeNo=%s, qrURL=%s", outTradeNo, qrURL)

	t.Log("the simulated payment is complete")

	time.Sleep(30 * time.Second)

	// check the status of your payment
	status, _, err := ap.GetPaymentDetails(outTradeNo)
	if err != nil {
		t.Fatalf("GetPaymentDetails() failed: %v", err)
	}
	if status != PaymentSuccess {
		t.Fatalf("expected status %s, got %s", PaymentSuccess, status)
	}
	t.Logf("payment status：%s", status)

	// refund process
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
