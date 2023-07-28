package pay

import (
	"fmt"

	"github.com/stripe/stripe-go/v74"
)

type PaymentStatus string

const (
	PaymentSuccess    PaymentStatus = "success"
	PaymentNotPaid    PaymentStatus = "not_paid"
	PaymentProcessing PaymentStatus = "processing"
	PaymentExpired    PaymentStatus = "expired"
	PaymentFailed     PaymentStatus = "failed"
	PaymentUnknown    PaymentStatus = "unknown"
)

const (
	SuccessURL string = "https://cloud.sealos.io"
	CancelURL  string = "https://cloud.sealos.io"
)

type WechatPayment struct {
}

type StripePayment struct {
}

type Interface interface {
	CreatePayment(amount int64, user string) (string, string, error)
	GetPaymentDetails(sessionID string) (PaymentStatus, int64, error)
	ExpireSession(payment string) error
}

func (w WechatPayment) CreatePayment(amount int64, user string) (string, string, error) {
	tradeNO := GetRandomString(32)
	codeURL, err := WechatPay(amount, user, tradeNO, "", "")
	if err != nil {
		return "", "", err
	}
	return tradeNO, codeURL, nil
}

func (w WechatPayment) GetPaymentDetails(sessionID string) (PaymentStatus, int64, error) {
	orderResp, err := QueryOrder(sessionID)
	if err != nil {
		return "", 0, err
	}
	switch *orderResp.TradeState {
	case StatusSuccess:
		return PaymentSuccess, *orderResp.Amount.Total, nil
	case StatusProcessing:
		return PaymentProcessing, 0, nil
	case StatusNotPay:
		return PaymentNotPaid, 0, nil
	case StatusFail:
		return PaymentFailed, 0, fmt.Errorf("order failed")
	default:
		return PaymentUnknown, 0, fmt.Errorf("unknown order status: %s", *orderResp.TradeState)
	}
}

func (w WechatPayment) ExpireSession(_ string) error {
	return nil
}

func (s StripePayment) CreatePayment(amount int64, _ string) (string, string, error) {
	session, err := CreateCheckoutSession(amount, CNY, SuccessURL, CancelURL)
	if err != nil {
		return "", "", err
	}
	return session.ID, "", nil
}

func (s StripePayment) GetPaymentDetails(sessionID string) (PaymentStatus, int64, error) {
	ses, err := GetSession(sessionID)
	if err != nil {
		return "", 0, err
	}
	switch ses.Status {
	case stripe.CheckoutSessionStatusComplete:
		return PaymentSuccess, ses.AmountTotal, nil
	case stripe.CheckoutSessionStatusExpired:
		return PaymentExpired, 0, nil
	case stripe.CheckoutSessionStatusOpen:
		return PaymentProcessing, 0, nil
	default:
		return PaymentUnknown, 0, fmt.Errorf("unknown order status: %s", ses.Status)
	}
}

func (s StripePayment) ExpireSession(sessionID string) error {
	_, err := ExpireSession(sessionID)
	if err != nil {
		return err
	}
	return nil
}

func NewPayHandler(paymentMethod string) (Interface, error) {
	switch paymentMethod {
	case "stripe":
		return &StripePayment{}, nil
	case "wechat":
		return &WechatPayment{}, nil
	default:
		return nil, fmt.Errorf("unsupported payment method: %s", paymentMethod)
	}
}
