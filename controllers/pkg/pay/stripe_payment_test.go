// Copyright © 2024 sealos.
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
	"testing"
)

func TestCreateCheckoutSession(t *testing.T) {
	stripe, err := CreateCheckoutSession(2000, "cny", "http://localhost:8080", "http://localhost:8080")
	if err != nil {
		t.Error(err)
	}
	t.Log(stripe.ID)
}

//func setupEnv_stripe() {
//	const (
//		APIKEY = ""
//	)
//	// 检查环境变量是否已设置
//	if os.Getenv(StripeAPIKEY) == "" {
//		err := os.Setenv(StripeAPIKEY, APIKEY)
//		if err != nil {
//			log.Fatalf("failed to set environment variables: %v", err)
//		}
//	}
//
//	// 沙盒环境
//	err := os.Setenv(StripeAPIKEY, "true")
//	if err != nil {
//		return
//	}
//}

//func TestStripsPayment_PaymentAndRefund(t *testing.T) {
//	setupEnv_stripe()
//	stripe.Key = os.Getenv(StripeAPIKEY)
//
//	// 1. 创建支付意图
//	piParams := &stripe.PaymentIntentParams{
//		Amount:             stripe.Int64(2000), // 2000 分 = ¥20.00
//		Currency:           stripe.String(string(stripe.CurrencyCNY)),
//		PaymentMethodTypes: stripe.StringSlice([]string{"card"}), // 使用卡支付
//	}
//	pi, err := paymentintent.New(piParams)
//	if err != nil {
//		t.Fatalf("failed to create a payment intent: %v", err)
//	}
//	t.Logf("PaymentIntent 创建成功，ID=%s", pi.ID)
//
//	// 2. 对该支付意图执行部分退款（示例：退款 1000 分）
//	refundParams := &stripe.RefundParams{
//		PaymentIntent: stripe.String(pi.ID),
//		Amount:        stripe.Int64(1000), // 退款 1000 分 = ¥10.00
//	}
//	r, err := refund.New(refundParams)
//	if err != nil {
//		t.Fatalf("refund failed: %v", err)
//	}
//	t.Logf("the refund was successful，Refund ID=%s，refund amount=%d", r.ID, r.Amount)
//}
