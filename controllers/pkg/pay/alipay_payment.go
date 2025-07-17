package pay

import (
	"context"
	"fmt"
	"github.com/labring/sealos/controllers/pkg/account"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"os"
	"strconv"
	"time"

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

// RefundPayment 退款
func (a *AlipayPayment) RefundPayment(option RefundOption) (string, string, error) {
	ctx := context.Background()

	// 查询订单获取打款时间
	qresp, err := a.client.TradeQuery(ctx, alipay.TradeQuery{
		OutTradeNo: option.TradeNo,
	})
	if err != nil {
		return "", "", fmt.Errorf("查询支付宝订单失败: %v", err)
	}

	// 用 SendPayDate 做时间校验
	if qresp.SendPayDate == "" {
		return "", "", fmt.Errorf("订单 %s 支付时间未知，无法判断退款时效", option.TradeNo)
	}
	paidAt, err := time.ParseInLocation("2006-01-02 15:04:05", qresp.SendPayDate, time.Local)
	if err != nil {
		return "", "", fmt.Errorf("解析支付时间失败: %v", err)
	}
	if time.Since(paidAt) > 365*24*time.Hour {
		return "", "", fmt.Errorf("订单 %s 已超过一年退款期限，无法退款", option.TradeNo)
	}

	outRequestNo := uuid.NewString()

	// 金额单位转换：option.Amount 单位为“分”，SDK 接口要求“元”，支持两位小数
	refundAmt := fmt.Sprintf("%.2f", float64(option.Amount)/1_000_000)

	req := alipay.TradeRefund{
		OutTradeNo:   option.TradeNo, // 商户原订单号，与 TradeNo 二选一
		OutRequestNo: outRequestNo,   // 本次退款请求号，保证幂等
		RefundAmount: refundAmt,      // 本次退款金额，单位“元”，支持两位小数
		RefundReason: fmt.Sprintf("refund for order %s", option.OrderID),
	}

	resp, err := a.client.TradeRefund(context.Background(), req)
	if err != nil {
		return "", "", fmt.Errorf("alipay TradeRefund error: %v", err)
	}

	// 响应解析：resp.RefundFee 为本次退款金额，单位“元”，字符串类型
	// 也可以根据 resp.FundChange 或 resp.RefundStatus 做进一步判断
	return outRequestNo, resp.RefundFee, nil
}
