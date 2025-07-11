package pay

import (
	"context"
	"fmt"
	"os"
	"strconv"

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
	return &AlipayPayment{client: client}, nil
}

// CreatePayment 创建支付，返回支付URL和订单号
func (a *AlipayPayment) CreatePayment(amount int64, _, _ string) (string, string, error) {
	var p = alipay.TradePagePay{}
	p.Subject = "sealos_cloud_pay"
	p.OutTradeNo = uuid.NewString()
	p.TotalAmount = fmt.Sprintf("%.2f", float64(amount)/1_000_000) // 金额单位转元
	p.ProductCode = "FAST_INSTANT_TRADE_PAY"
	p.QRPayMode = "2"
	p.TimeoutExpress = "10m"
	url, err := a.client.TradePagePay(p)
	if err != nil {
		return "", "", err
	}
	return p.OutTradeNo, url.String(), nil
}

// GetPaymentDetails 查询支付状态
func (a *AlipayPayment) GetPaymentDetails(sessionID string) (string, int64, error) {
	resp, err := a.client.TradeQuery(context.Background(), alipay.TradeQuery{
		OutTradeNo: sessionID,
	})
	if err != nil {
		return PaymentUnknown, 0, err
	}
	amount, _ := strconv.ParseFloat(resp.TotalAmount, 64)
	amountInt := int64(amount * 1_000_000)
	// 状态映射
	var status string
	//  触发通知类型
	//  通知类型	描述	默认开启
	//  tradeStatus.TRADE_CLOSED	交易关闭	1
	//  tradeStatus.TRADE_FINISHED	交易完结	1
	//  tradeStatus.TRADE_SUCCESS	支付成功	1
	//  tradeStatus.WAIT_BUYER_PAY	交易创建	0
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

// ExpireSession 关闭订单
func (a *AlipayPayment) ExpireSession(payment string) error {
	_, err := a.client.TradeClose(context.Background(), alipay.TradeClose{
		OutTradeNo: payment,
	})
	return err
}
