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
	"fmt"
	"os"
	"strings"

	session2 "github.com/stripe/stripe-go/v74/checkout/session"

	"github.com/google/uuid"

	"github.com/stripe/stripe-go/v74/refund"

	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/stripe/stripe-go/v74"
)

var DefaultURL = "https://" + env.GetEnvWithDefault("DOMAIN", DefaultDomain)

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
	session, err := CreateCheckoutSession(
		amount/10000,
		Currency,
		DefaultURL+os.Getenv(stripeSuccessPostfix),
		DefaultURL+os.Getenv(stripeCancelPostfix),
	)
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

// RefundPayment processes a refund request with robust validation and error handling
// Returns (refundNo, refundID, error)
func (s StripePayment) RefundPayment(opt RefundOption) (string, string, error) {
	// Input validation
	if err := validateRefundOption(opt); err != nil {
		return "", "", fmt.Errorf("invalid refund request: %w", err)
	}
	refundNo := uuid.NewString()
	if opt.RefundID != "" {
		refundNo = opt.RefundID
	}

	// Check if Stripe API key is configured
	if stripe.Key == "" {
		return "", "", fmt.Errorf("stripe API key not configured")
	}

	params := &stripe.CheckoutSessionParams{}

	session, err := session2.Get(opt.TradeNo, params)
	if err != nil {
		return "", "", fmt.Errorf("failed to retrieve session for trade no %s: %w", opt.TradeNo, err)
	}

	if session.PaymentStatus != "paid" {
		return "", "", fmt.Errorf("failed to refund: session %s is not paid", opt.TradeNo)
	}

	if session.PaymentIntent == nil || session.PaymentIntent.ID == "" {
		return "", "", fmt.Errorf("failed to refund: payment intent ID is nil for session %s", opt.TradeNo)
	}

	// Build refund parameters with comprehensive metadata
	refundParams := &stripe.RefundParams{
		Params: stripe.Params{
			Metadata: map[string]string{
				"order_id":  opt.OrderID,
				"refund_id": refundNo,
			},
		},
		PaymentIntent: stripe.String(session.PaymentIntent.ID),
	}

	// Handle partial vs full refund
	if opt.Amount > 0 {
		// Validate that the amount is reasonable (convert to cents for Stripe)
		refundParams.Amount = stripe.Int64(opt.Amount / 10000) // Convert to cents
	} else {
		return "", "", fmt.Errorf("refund amount must be greater than zero")
	}

	// Create the refund
	refundResult, err := refund.New(refundParams)
	if err != nil {
		return "", "", fmt.Errorf("failed to create refund for charge %s: %w", opt.TradeNo, err)
	}

	// Validate the refund result
	if refundResult == nil {
		return "", "", fmt.Errorf("refund result is nil")
	}

	// Check refund status and provide appropriate feedback
	switch refundResult.Status {
	case stripe.RefundStatusSucceeded:
		return refundResult.ID, refundResult.ID, nil
	case stripe.RefundStatusPending:
		return refundResult.ID, refundResult.ID, fmt.Errorf("refund pending: refund ID %s is being processed", refundResult.ID)
	case stripe.RefundStatusFailed:
		return "", "", fmt.Errorf("refund failed: %s", refundResult.FailureReason)
	case stripe.RefundStatusCanceled:
		return "", "", fmt.Errorf("refund canceled: refund ID %s was canceled", refundResult.ID)
	default:
		return refundResult.ID, refundResult.ID, fmt.Errorf("refund created with unknown status: %s", refundResult.Status)
	}
}

// validateRefundOption validates the refund request parameters
func validateRefundOption(opt RefundOption) error {
	if opt.TradeNo == "" {
		return fmt.Errorf("trade_no (charge ID) is required")
	}
	if opt.Amount <= 0 {
		return fmt.Errorf("refund amount cannot be negative")
	}
	return nil
}
