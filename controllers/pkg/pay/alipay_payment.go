package pay

import (
	"context"
	"fmt"
	"html"
	"os"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/account"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/smartwalle/alipay/v3"
)

type AlipayPayment struct {
	client *alipay.Client
}

func NewAlipayPayment() (*AlipayPayment, error) {
	client, err := alipay.New(
		os.Getenv(account.AlipayAppID),
		os.Getenv(account.AlipayPrivateKey),
		env.GetBoolWithDefault(account.PayIsProduction, true),
	)
	if err != nil {
		return nil, fmt.Errorf("alipay client init failed: %w", err)
	}
	// err = client.LoadAliPayPublicKey(os.Getenv(account.AlipayPublicKey))
	// if err != nil {
	//	return nil, fmt.Errorf("load alipay public key failed: %v", err)
	//}
	if err = client.LoadAppCertPublicKey(os.Getenv(account.AlipayAppCertPublicKey)); err != nil {
		return nil, fmt.Errorf("load appCertPublicKey failed: %w", err)
	}
	if err = client.LoadAliPayRootCert(os.Getenv(account.AlipayRootCert)); err != nil {
		return nil, fmt.Errorf("load alipayRootCert failed: %w", err)
	}
	if err = client.LoadAlipayCertPublicKey(os.Getenv(account.AlipayCertPublicKey)); err != nil {
		return nil, fmt.Errorf("load alipayCertPublicKey failed: %w", err)
	}
	return &AlipayPayment{client}, nil
}

// CreatePayment creates a payment and returns the Alipay cashier page HTML and the order number
func (a *AlipayPayment) CreatePayment(amount int64, _, _ string) (string, string, error) {
	p := alipay.TradePagePay{}
	p.Subject = "sealos_cloud_pay"
	p.OutTradeNo = uuid.NewString()
	p.TotalAmount = fmt.Sprintf(
		"%.2f",
		float64(amount)/1_000_000,
	) // convert the amount unit to yuan
	p.ProductCode = "FAST_INSTANT_TRADE_PAY"
	p.QRPayMode = "4" // order code mode: Alipay renders the cashier page (with official QR code), embedded by the frontend via iframe
	p.QRCodeWidth = "210"
	p.TimeoutExpress = "10m"
	url, err := a.client.TradePagePay(p)
	if err != nil {
		return "", "", err
	}
	// Return an auto-submitting cashier form, embedded by the frontend via iframe srcDoc (same as FastGPT payment)
	html := fmt.Sprintf(
		`<form action="%s" method="get" id="alipaySubmit" style="display:none"></form><script>document.getElementById("alipaySubmit").submit();</script>`,
		html.EscapeString(url.String()),
	)
	return p.OutTradeNo, html, nil
}

// GetPaymentDetails checks the payment status
func (a *AlipayPayment) GetPaymentDetails(sessionID string) (string, int64, error) {
	resp, err := a.client.TradeQuery(context.Background(), alipay.TradeQuery{
		OutTradeNo: sessionID,
	})
	if err != nil {
		return PaymentUnknown, 0, err
	}
	amount, _ := strconv.ParseFloat(resp.TotalAmount, 64)
	amountInt := int64(amount * 1_000_000)
	// status mapping
	var status string
	// tradeStatus values and their meanings:
	// TRADE_CLOSED: transaction closed
	// TRADE_FINISHED: transaction finished
	// TRADE_SUCCESS: payment successful
	// WAIT_BUYER_PAY: waiting for buyer to pay
	switch resp.TradeStatus {
	case "TRADE_SUCCESS":
		status = PaymentSuccess
	case "WAIT_BUYER_PAY":
		status = PaymentProcessing
	case "TRADE_CLOSED", "TRADE_FINISHED":
		status = PaymentExpired
	default:
		status = PaymentUnknown
	}
	return status, amountInt, nil
}

// ExpireSession closes the order
func (a *AlipayPayment) ExpireSession(payment string) error {
	_, err := a.client.TradeClose(context.Background(), alipay.TradeClose{
		OutTradeNo: payment,
	})
	return err
}

// RefundPayment refunds a payment
func (a *AlipayPayment) RefundPayment(option RefundOption) (string, string, error) {
	ctx := context.Background()

	// query the order to get the payment time
	qresp, err := a.client.TradeQuery(ctx, alipay.TradeQuery{
		OutTradeNo: option.TradeNo,
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to query Alipay order: %w", err)
	}

	// use sendPayDate to verify the payment time
	if qresp.SendPayDate == "" {
		return "", "", fmt.Errorf(
			"the payment time of order %s is unknown, and it is impossible to determine the refund time",
			option.TradeNo,
		)
	}
	paidAt, err := time.ParseInLocation(time.DateTime, qresp.SendPayDate, time.Local)
	if err != nil {
		return "", "", fmt.Errorf("failed to parse the payment time %w", err)
	}
	if time.Since(paidAt) > 365*24*time.Hour {
		return "", "", fmt.Errorf(
			"order %s has exceeded the one-year refund period and cannot be refunded",
			option.TradeNo,
		)
	}

	outRequestNo := uuid.NewString()

	// amount unit conversion: option.Amount is in "cents" and the SDK API requires "yuan" with two decimal places
	refundAmt := fmt.Sprintf("%.2f", float64(option.Amount)/1_000_000)

	req := alipay.TradeRefund{
		OutTradeNo:   option.TradeNo, // merchant's original order number, use either this or TradeNo
		OutRequestNo: outRequestNo,   // refund request number for this request, guarantees idempotency
		RefundAmount: refundAmt,      // refund amount, in "yuan", supports two decimal places
		RefundReason: "refund for order " + option.OrderID,
	}

	resp, err := a.client.TradeRefund(context.Background(), req)
	if err != nil {
		return "", "", fmt.Errorf("alipay TradeRefund error: %w", err)
	}

	// response parsing: resp.RefundFee is the refund amount in yuan (string type)
	// it can also be judged by resp.FundChange or resp.RefundStatus for further processing
	return outRequestNo, resp.RefundFee, nil
}
