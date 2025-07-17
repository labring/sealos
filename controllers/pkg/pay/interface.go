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

type RefundOption struct {
	OrderID string `json:"order_id"`
	TradeNo string `json:"trade_no"`
	Amount  int64  `json:"amount"`
}

type Interface interface {
	// amount = sealos amount
	CreatePayment(amount int64, user, describe string) (tradeNo string, codeURL string, err error)
	RefundPayment(option RefundOption) (refundNo string, refundID string, err error)
	GetPaymentDetails(sessionID string) (string, int64, error)
	ExpireSession(payment string) error
}

func NewPayHandler(paymentMethod string) (Interface, error) {
	switch paymentMethod {
	case "stripe":
		return &StripePayment{}, nil
	case "wechat":
		return &WechatPayment{}, nil
	case "alipay":
		return NewAlipayPayment()
	default:
		//return nil, fmt.Errorf("unsupported payment method: %s", paymentMethod)
		//TODO Now set it as the default wechat, and modify it a few days later
		return &WechatPayment{}, nil
	}
}
