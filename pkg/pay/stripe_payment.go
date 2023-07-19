package pay

import (
	"os"

	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/checkout/session"
)

const StripeAPIKEY = "STRIPE_API_KEY"

func init() {
	stripe.Key = os.Getenv(StripeAPIKEY)
}

// const currentcy
const (
	USD = "usd"
	CNY = "cny"
)

func CreateCheckoutSession(amount int64, currency, successURL, cancelURL string) (*stripe.CheckoutSession, error) {
	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
		}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					UnitAmount: stripe.Int64(amount),
					Currency:   stripe.String(currency),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String("Sealos Recharge"),
					},
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
	}

	s, err := session.New(params)
	if err != nil {
		return nil, err
	}

	return s, nil
}

func GetSession(sessionID string) (*stripe.CheckoutSession, error) {
	return session.Get(sessionID, nil)
}

// ExpireSession
func ExpireSession(sessionID string) (*stripe.CheckoutSession, error) {
	return session.Expire(sessionID, nil)
}
