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
	"time"

	"github.com/wechatpay-apiv3/wechatpay-go/core"
	"github.com/wechatpay-apiv3/wechatpay-go/services/refunddomestic"
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
	// check the order and get SuccessTime
	orderResp, err := QueryOrder(option.TradeNo)
	if err != nil {
		return "", "", fmt.Errorf("failed to query wechat order: %v", err)
	}
	if orderResp.SuccessTime != nil {
		// The SuccessTime format is generally RFC3339
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

	// generate a merchant refund number
	refundNo := GetRandomString(32)
	if refundNo == "" {
		return "", "", fmt.Errorf("generate refundNo failed")
	}

	// Amount Unit Conversion: option. Amount is the "cent", which is the same as CreatePayment (amount/10000)
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

	// call the refund api
	svc := refunddomestic.RefundsApiService{Client: client}
	resp, _, err := svc.Create(ctx, req)
	if err != nil {
		return refundNo, "", fmt.Errorf("call Refund API error: %v", err)
	}
	if resp == nil || resp.RefundId == nil {
		return refundNo, "", fmt.Errorf("empty refund response")
	}

	// Return: Merchant Refund Number & WeChat Refund Number
	return refundNo, *resp.RefundId, nil
}
