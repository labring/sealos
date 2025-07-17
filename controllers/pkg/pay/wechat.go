// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package pay

import (
	"context"
	"fmt"
	"github.com/wechatpay-apiv3/wechatpay-go/core"
	"github.com/wechatpay-apiv3/wechatpay-go/services/refunddomestic"
	"time"
)

func (w WechatPayment) CreatePayment(amount int64, user, describe string) (string, string, error) {
	tradeNO := GetRandomString(32)
	codeURL, err := WechatPay(amount/10000, user, tradeNO, describe, "")
	if err != nil {
		return "", "", err
	}
	return tradeNO, codeURL, nil
}

func (w WechatPayment) GetPaymentDetails(sessionID string) (string, int64, error) {
	orderResp, err := QueryOrder(sessionID)
	if err != nil {
		return "", 0, err
	}
	switch *orderResp.TradeState {
	case StatusSuccess:
		return PaymentSuccess, *orderResp.Amount.Total * 10000, nil
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

func (w WechatPayment) RefundPayment(option RefundOption) (string, string, error) {
	// 查询订单，拿到 SuccessTime
	orderResp, err := QueryOrder(option.TradeNo)
	if err != nil {
		return "", "", fmt.Errorf("failed to query wechat order: %v", err)
	}
	if orderResp.SuccessTime != nil {
		// SuccessTime 格式一般是 RFC3339
		paidAt, err := time.Parse(time.RFC3339, *orderResp.SuccessTime)
		if err != nil {
			return "", "", fmt.Errorf("failed to resolve the payment time: %v", err)
		}
		if time.Since(paidAt) > 365*24*time.Hour {
			return "", "", fmt.Errorf("order %s has exceeded the one-year refund period and cannot be refunded", option.TradeNo)
		}
	} else {
		return "", "", fmt.Errorf("order %s has not been paid or the payment time is unknown and cannot be refunded", option.TradeNo)
	}

	// 生成商户退款单号
	refundNo := GetRandomString(32)
	if refundNo == "" {
		return "", "", fmt.Errorf("generate refundNo failed")
	}

	// 金额单位转换：option.Amount 是“分”，与 CreatePayment 保持一致（amount/10000）
	refundAmt := option.Amount / 10000

	ctx := context.Background()
	client, err := NewClient(ctx)
	if err != nil {
		return "", "", fmt.Errorf("new wechat pay client err: %v", err)
	}

	req := refunddomestic.CreateRequest{
		OutTradeNo:  core.String(option.TradeNo),
		OutRefundNo: core.String(refundNo),
		Reason:      core.String(fmt.Sprintf("refund for order %s", option.OrderID)),
		Amount: &refunddomestic.AmountReq{
			Total:    core.Int64(refundAmt),
			Refund:   core.Int64(refundAmt),
			Currency: core.String("CNY"),
		},
	}

	// 调用退款接口
	svc := refunddomestic.RefundsApiService{Client: client}
	resp, _, err := svc.Create(ctx, req)
	if err != nil {
		return refundNo, "", fmt.Errorf("call Refund API error: %v", err)
	}
	if resp == nil || resp.RefundId == nil {
		return refundNo, "", fmt.Errorf("empty refund response")
	}

	// 返回：商户退款单号 & 微信退款单号
	return refundNo, *resp.RefundId, nil
}
