package pay

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/labring/sealos/controllers/pkg/account"
	"github.com/labring/sealos/controllers/pkg/utils/env"

	"github.com/google/uuid"
	"github.com/smartwalle/alipay/v3"
)

type AlipayPayment struct {
	client *alipay.Client
}

func NewAlipayPayment() (*AlipayPayment, error) {
	client, err := alipay.New(os.Getenv(account.AlipayAppID), os.Getenv(account.AlipayPrivateKey), env.GetBoolWithDefault(account.PayIsProduction, true))
	if err != nil {
		return nil, fmt.Errorf("alipay client init failed: %v", err)
	}
	//err = client.LoadAliPayPublicKey(os.Getenv(account.AlipayPublicKey))
	//if err != nil {
	//	return nil, fmt.Errorf("load alipay public key failed: %v", err)
	//}
	if err = client.LoadAppCertPublicKey(os.Getenv(account.AlipayAppCertPublicKey)); err != nil {
		return nil, fmt.Errorf("load appCertPublicKey failed: %v", err)
	}
	if err = client.LoadAliPayRootCert(os.Getenv(account.AlipayRootCert)); err != nil {
		return nil, fmt.Errorf("load alipayRootCert failed: %v", err)
	}
	if err = client.LoadAlipayCertPublicKey(os.Getenv(account.AlipayCertPublicKey)); err != nil {
		return nil, fmt.Errorf("load alipayCertPublicKey failed: %v", err)
	}
	return &AlipayPayment{client}, nil
}

// CreatePayment Create a payment and return the payment URL and order number
func (a *AlipayPayment) CreatePayment(amount int64, _, _ string) (string, string, error) {
	var p = alipay.TradePagePay{}
	p.Subject = "sealos_cloud_pay"
	p.OutTradeNo = uuid.NewString()
	p.TotalAmount = fmt.Sprintf("%.2f", float64(amount)/1_000_000) // the unit of the amount is converted to a dollar
	p.ProductCode = "FAST_INSTANT_TRADE_PAY"
	p.QRPayMode = "2"
	p.TimeoutExpress = "10m"
	url, err := a.client.TradePagePay(p)
	if err != nil {
		return "", "", err
	}
	return p.OutTradeNo, url.String(), nil
}

// GetPaymentDetails check the status of your payment
func (a *AlipayPayment) GetPaymentDetails(sessionID string) (string, int64, error) {
	resp, err := a.client.TradeQuery(context.Background(), alipay.TradeQuery{
		OutTradeNo: sessionID,
	})
	if err != nil {
		return PaymentUnknown, 0, err
	}
	amount, _ := strconv.ParseFloat(resp.TotalAmount, 64)
	amountInt := int64(amount * 1_000_000)
	// state mapping
	var status string
	//  the type of notification that is triggered
	//  notification type	description	  it is enabled by default
	//  tradeStatus.TRADE_CLOSED	transaction-closed	1
	//  tradeStatus.TRADE_FINISHED	the-transaction-is-closed	1
	//  tradeStatus.TRADE_SUCCESS	the-payment-was-successful	1
	//  tradeStatus.WAIT_BUYER_PAY	deal-creation	0
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

// ExpireSession close the order
func (a *AlipayPayment) ExpireSession(payment string) error {
	_, err := a.client.TradeClose(context.Background(), alipay.TradeClose{
		OutTradeNo: payment,
	})
	return err
}

// RefundPayment refund
func (a *AlipayPayment) RefundPayment(option RefundOption) (string, string, error) {
	ctx := context.Background()

	// query the order to get the payment time
	qresp, err := a.client.TradeQuery(ctx, alipay.TradeQuery{
		OutTradeNo: option.TradeNo,
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to query Alipay order: %v", err)
	}

	// use sendpaydate to verify the time
	if qresp.SendPayDate == "" {
		return "", "", fmt.Errorf("the payment time of order %s is unknown, and it is impossible to determine the refund time", option.TradeNo)
	}
	paidAt, err := time.ParseInLocation("2006-01-02 15:04:05", qresp.SendPayDate, time.Local)
	if err != nil {
		return "", "", fmt.Errorf("failed to parse the payment time %v", err)
	}
	if time.Since(paidAt) > 365*24*time.Hour {
		return "", "", fmt.Errorf("order %s has exceeded the one-year refund period and cannot be refunded", option.TradeNo)
	}

	outRequestNo := uuid.NewString()

	// Amount Unit Conversion: option. The unit of Amount is "cent", and the SDK API requires "yuan" and supports two decimal places
	refundAmt := fmt.Sprintf("%.2f", float64(option.Amount)/1_000_000)

	req := alipay.TradeRefund{
		OutTradeNo:   option.TradeNo, // Merchant's original order number, choose one of the two with TradeNo
		OutRequestNo: outRequestNo,   // The number of this refund request, guaranteed idempotent
		RefundAmount: refundAmt,      // The amount of this refund, in "yuan", supports two decimal places
		RefundReason: fmt.Sprintf("refund for order %s", option.OrderID),
	}

	resp, err := a.client.TradeRefund(context.Background(), req)
	if err != nil {
		return "", "", fmt.Errorf("alipay TradeRefund error: %v", err)
	}

	// Response parsing: resp. RefundFee is the amount of the refund, in yuan and string type
	// It can also be used according to the resp. FundChange or resp. RefundStatus for further judgment
	return outRequestNo, resp.RefundFee, nil
}
