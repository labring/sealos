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
//	// check that the environment variables are set
//	if os.Getenv(StripeAPIKEY) == "" {
//		err := os.Setenv(StripeAPIKEY, APIKEY)
//		if err != nil {
//			log.Fatalf("failed to set environment variables: %v", err)
//		}
//	}
//
//	// sandboxEnvironment
//	err := os.Setenv(StripeAPIKEY, "true")
//	if err != nil {
//		return
//	}
//}

//func TestStripsPayment_PaymentAndRefund(t *testing.T) {
//	setupEnv_stripe()
//	stripe.Key = os.Getenv(StripeAPIKEY)
//
//	// 1. create a payment intent
//	piParams := &stripe.PaymentIntentParams{
//		Amount:             stripe.Int64(2000), // 2000 分 = ¥20.00
//		Currency:           stripe.String(string(stripe.CurrencyCNY)),
//		PaymentMethodTypes: stripe.StringSlice([]string{"card"}), // pay with a card
//	}
//	pi, err := paymentintent.New(piParams)
//	if err != nil {
//		t.Fatalf("failed to create a payment intent: %v", err)
//	}
//	t.Logf("PaymentIntent the creation is successful，ID=%s", pi.ID)
//
//	// 2. perform a partial refund for that payment intent
//	refundParams := &stripe.RefundParams{
//		PaymentIntent: stripe.String(pi.ID),
//		Amount:        stripe.Int64(1000), // refund 1000 cent = ¥10.00
//	}
//	r, err := refund.New(refundParams)
//	if err != nil {
//		t.Fatalf("refund failed: %v", err)
//	}
//	t.Logf("the refund was successful，Refund ID=%s，refund amount=%d", r.ID, r.Amount)
//}
