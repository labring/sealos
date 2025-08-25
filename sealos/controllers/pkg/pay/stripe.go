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
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/stripe/stripe-go/v74"

	"github.com/labring/sealos/controllers/pkg/utils/env"
)

var DefaultURL = fmt.Sprintf("https://%s", env.GetEnvWithDefault("DOMAIN", DefaultDomain))

const (
	stripeSuccessPostfix = "STRIPE_SUCCESS_POSTFIX"
	stripeCancelPostfix  = "STRIPE_CANCEL_POSTFIX"
	stripeCurrency       = "STRIPE_CURRENCY"
)

var Currency string

func init() {
	if port := os.Getenv("PORT"); port != "" {
		DefaultURL = fmt.Sprintf("%s:%s", DefaultURL, port)
	}
	currency := strings.ToLower(strings.TrimSpace(os.Getenv(stripeCurrency)))
	if currency != USD {
		currency = CNY
	}
	Currency = currency
}

func (s StripePayment) CreatePayment(amount int64, _, _ string) (string, string, error) {
	session, err := CreateCheckoutSession(amount/10000, Currency, DefaultURL+os.Getenv(stripeSuccessPostfix), DefaultURL+os.Getenv(stripeCancelPostfix))
	if err != nil {
		return "", "", err
	}
	return session.ID, "", nil
}

func (s StripePayment) GetPaymentDetails(sessionID string) (string, int64, error) {
	ses, err := GetSession(sessionID)
	if err != nil {
		return "", 0, err
	}
	switch ses.Status {
	case stripe.CheckoutSessionStatusComplete:
		return PaymentSuccess, ses.AmountTotal * 10000, nil
	case stripe.CheckoutSessionStatusExpired:
		return PaymentExpired, 0, nil
	case stripe.CheckoutSessionStatusOpen:
		return PaymentProcessing, 0, nil
	default:
		return PaymentUnknown, 0, fmt.Errorf("unknown order status: %s", ses.Status)
	}
}

func (s StripePayment) ExpireSession(sessionID string) error {
	status, _, _ := s.GetPaymentDetails(sessionID)
	if status == PaymentSuccess || status == PaymentExpired {
		return nil
	}
	_, err := ExpireSession(sessionID)
	if err != nil {
		return err
	}
	return nil
}

// RefundPayment TODO
// RefundPayment if the test fails an error is returned
func (s StripePayment) RefundPayment(opt RefundOption) (string, string, error) {
	/*params := &stripe.RefundParams{
		Params: stripe.Params{
			Metadata: map[string]string{
				"order_id": opt.OrderID,
			},
		},
	}

	params.Charge = stripe.String(opt.TradeNo)
	// 如果指定了金额，则发起部分退款；否则为全额退款
	if opt.Amount > 0 {
		params.Amount = stripe.Int64(opt.Amount)
	}

	r, err := refund.New(params)
	if err != nil {
		return "", "", err
	}*/

	return "", "", errors.New("暂未实现")
}
