package services

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/sirupsen/logrus"

	"gorm.io/gorm"

	"github.com/google/uuid"

	refund2 "github.com/stripe/stripe-go/v82/refund"

	"github.com/stripe/stripe-go/v82/invoice"

	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/stripe/stripe-go/v82"
	portalsession "github.com/stripe/stripe-go/v82/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/customer"
	"github.com/stripe/stripe-go/v82/paymentmethod"
	"github.com/stripe/stripe-go/v82/price"
	"github.com/stripe/stripe-go/v82/product"
	"github.com/stripe/stripe-go/v82/subscription"
	"github.com/stripe/stripe-go/v82/webhook"
)

// StripeService provides Stripe integration for workspace subscriptions
type StripeService struct {
	SecretKey      string
	PublishableKey string
	Domain         string
	WebhookSecret  string
}

// NewStripeService creates a new Stripe service instance following official pattern
func NewStripeService() *StripeService {
	secretKey := os.Getenv("STRIPE_SECRET_KEY")
	if secretKey == "" {
		panic("STRIPE_SECRET_KEY environment variable is not set")
	}

	// Set global Stripe key following official example
	stripe.Key = secretKey

	return &StripeService{
		SecretKey:     secretKey,
		Domain:        getBaseURL(),
		WebhookSecret: os.Getenv("STRIPE_WEBHOOK_SECRET"),
	}
}

func getBaseURL() string {
	if domain := os.Getenv("DOMAIN"); domain != "" {
		return "https://" + domain
	}
	return "https://cloud.sealos.io"
}

func buildURLs(s *StripeService, transaction *types.WorkspaceSubscriptionTransaction) (string, string, error) {
	//https://192.168.10.35.nip.io/?openapp=system-costcenter?payId%3D4W86BOp70ltT%26stripeState%3Dsuccess%26transactionId%3D3d09bc07-976c-44bc-8b52-05619693056e%26workspaceId%3Dns-47f3dbxj
	baseURL := s.Domain + "/?payId=" + transaction.PayID + "&workspaceId=" + transaction.Workspace + "&transactionId=" + transaction.ID.String() + "&stripeState="
	successURL := baseURL + "success"
	cancelURL := baseURL + "cancel"

	return successURL, cancelURL, nil
}

// CreateWorkspaceSubscriptionSession creates a Stripe Checkout Session following official pattern
func (s *StripeService) CreateWorkspaceSubscriptionSession(paymentReq PaymentRequest, priceID string, transaction *types.WorkspaceSubscriptionTransaction) (*StripeResponse, error) {
	return s.CreateWorkspaceSubscriptionSessionWithDiscount(paymentReq, priceID, transaction, "")
}

// CreateWorkspaceSubscriptionSessionWithDiscount creates a Stripe Checkout Session with optional discount code
func (s *StripeService) CreateWorkspaceSubscriptionSessionWithDiscount(paymentReq PaymentRequest, priceID string, transaction *types.WorkspaceSubscriptionTransaction, discountCode string) (*StripeResponse, error) {
	// 构造成功与取消回调URL，避免硬编码斜杠问题
	// Assuming workspaceID and transaction.PayID are your custom variables
	successURL, cancelURL, err := buildURLs(s, transaction)
	if err != nil {
		return nil, fmt.Errorf("failed to build return URLs: %v", err)
	}
	// Create checkout session following official example pattern
	var anchorTime int64

	// For upgrades, start new billing cycle from now. For other operations, use 30 days later.
	if transaction.Operator == types.SubscriptionTransactionTypeUpgraded {
		anchorTime = time.Now().UTC().Unix()
	} else {
		anchorTime = time.Now().AddDate(0, 0, 30).Unix()
	}

	extra := &stripe.ExtraValues{
		Values: url.Values{},
	}
	//extra.Add("subscription_data[backdate_start_date]", fmt.Sprintf("%d", time.Now().AddDate(0, 0, -1).Unix()))
	checkoutParams := &stripe.CheckoutSessionParams{
		Params: stripe.Params{
			Extra: extra,
		},
		Customer: paymentReq.CustomerID,
		Metadata: map[string]string{
			"region_domain": transaction.RegionDomain,
			"payment_id":    transaction.PayID,
		},
		SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
			Metadata: map[string]string{
				"workspace":             transaction.Workspace,
				"region_domain":         transaction.RegionDomain,
				"plan_name":             transaction.NewPlanName,
				"period":                string(transaction.Period),
				"payment_id":            transaction.PayID,
				"subscription_operator": string(transaction.Operator),
				"user_uid":              paymentReq.UserUID.String(),
				"transaction_id":        transaction.ID.String(),
			},
			BillingCycleAnchor: stripe.Int64(anchorTime),
			ProrationBehavior:  stripe.String("create_prorations"),
		},
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		//BillingAddressCollection: stripe.String("required"),
		AutomaticTax: &stripe.CheckoutSessionAutomaticTaxParams{
			Enabled: stripe.Bool(false),
		},
		ExpiresAt:           stripe.Int64(time.Now().UTC().Add(31 * time.Minute).Unix()),
		AllowPromotionCodes: stripe.Bool(true),
	}

	// Add discount code if provided
	if discountCode != "" {
		checkoutParams.Discounts = []*stripe.CheckoutSessionDiscountParams{
			{
				Coupon: stripe.String(discountCode),
			},
		}
	}

	// Create session using official SDK
	sess, err := checkoutsession.New(checkoutParams)
	if err != nil {
		return nil, fmt.Errorf("stripe.NewCheckoutSession: %v", err)
	}

	return &StripeResponse{
		SessionID: sess.ID,
		URL:       sess.URL,
	}, nil
}

// SetCustomerMetadata sets metadata for a Stripe customer
func (s *StripeService) SetCustomerMetadata(customerID string, metadata map[string]string) error {
	params := &stripe.CustomerParams{}
	for k, v := range metadata {
		params.AddMetadata(k, v)
	}
	_, err := customer.Update(customerID, params)
	if err != nil {
		return fmt.Errorf("customer.Update: %v", err)
	}
	return nil
}

// CancelWorkspaceSubscriptionSession cancels a Stripe Checkout Session，如果仍然未支付
func (s *StripeService) CancelWorkspaceSubscriptionSession(sessionID string) error {
	sess, err := checkoutsession.Get(sessionID, nil)
	if err != nil {
		return fmt.Errorf("checkoutsession.Get: %v", err)
	}
	if sess.PaymentStatus == stripe.CheckoutSessionPaymentStatusUnpaid && sess.Status == stripe.CheckoutSessionStatusOpen {
		_, err := checkoutsession.Expire(sessionID, nil)
		if err != nil {
			return fmt.Errorf("checkoutsession.Cancel: %v", err)
		}
	}
	return nil
}

// RefundSubscription only refund the latest payment
func (s *StripeService) RefundSubscription(subscriptionID string) error {
	sub, err := subscription.Get(subscriptionID, &stripe.SubscriptionParams{
		Expand: []*string{stripe.String("latest_invoice.payments")},
	})
	if err != nil {
		return fmt.Errorf("subscription.Get: %v", err)
	}
	if sub.LatestInvoice.Payments == nil || len(sub.LatestInvoice.Payments.Data) == 0 {
		return fmt.Errorf("no payment found for invoice")
	}
	item := sub.LatestInvoice.Payments.Data[len(sub.LatestInvoice.Payments.Data)-1]
	if item.Payment == nil {
		return fmt.Errorf("no payment info found for invoice")
	}
	refundParams := stripe.RefundParams{}
	if item.Payment.PaymentIntent != nil {
		refundParams.PaymentIntent = stripe.String(item.Payment.PaymentIntent.ID)
	}
	if item.Payment.Charge != nil {
		refundParams.Charge = stripe.String(item.Payment.Charge.ID)
	}

	_, err = refund2.New(&refundParams)
	if err != nil {
		return fmt.Errorf("stripe.RefundNew: %v", err)
	}
	return nil
}

// UpdatePlan updates the subscription plan for a given subscription ID
func (s *StripeService) UpdatePlan(subscriptionID, newPriceID, newPlanName string, payReqID string) (*stripe.Subscription, error) {
	// Retrieve the current subscription
	sub, err := subscription.Get(subscriptionID, nil)
	if err != nil {
		return nil, fmt.Errorf("subscription.Get: %v", err)
	}

	if len(sub.Items.Data) == 0 {
		return nil, fmt.Errorf("subscription has no items to update")
	}

	//var wkSub types.WorkspaceSubscription
	// Update the subscription to the new price
	params := &stripe.SubscriptionParams{
		Items: []*stripe.SubscriptionItemsParams{
			{
				ID:    stripe.String(sub.Items.Data[len(sub.Items.Data)-1].ID),
				Price: stripe.String(newPriceID),
			},
		},
		Metadata: map[string]string{
			"updated_at":            time.Now().Format(time.RFC3339),
			"old_plan_name":         sub.Metadata["plan_name"],
			"new_plan_name":         newPlanName,
			"plan_name":             newPlanName,
			"subscription_operator": string(types.SubscriptionTransactionTypeUpgraded),
			"last_payment_id":       payReqID,
		},
		BillingCycleAnchorNow: stripe.Bool(true),
		ProrationBehavior:     stripe.String(stripe.SubscriptionSchedulePhaseProrationBehaviorAlwaysInvoice),
		//PaymentBehavior:   stripe.String(string(stripe.SubscriptionPaymentBehaviorDefaultIncomplete)),
	}

	updatedSub, err := subscription.Update(subscriptionID, params)
	if err != nil {
		return nil, fmt.Errorf("subscription.Update: %v", err)
	}

	return updatedSub, nil
}

// DowngradePlan updates the subscription plan for a given subscription ID
func (s *StripeService) DowngradePlan(subscriptionID, newPriceID, newPlanName string, transactionID uuid.UUID) (*stripe.Subscription, error) {
	// Retrieve the current subscription
	sub, err := subscription.Get(subscriptionID, nil)
	if err != nil {
		return nil, fmt.Errorf("subscription.Get: %v", err)
	}

	if len(sub.Items.Data) == 0 {
		return nil, fmt.Errorf("subscription has no items to update")
	}

	//var wkSub types.WorkspaceSubscription
	// Update the subscription to the new price
	params := &stripe.SubscriptionParams{
		Items: []*stripe.SubscriptionItemsParams{
			{
				ID:    stripe.String(sub.Items.Data[len(sub.Items.Data)-1].ID),
				Price: stripe.String(newPriceID),
			},
		},
		Metadata: map[string]string{
			"updated_at":            time.Now().Format(time.RFC3339),
			"old_plan_name":         sub.Metadata["plan_name"],
			"new_plan_name":         newPlanName,
			"plan_name":             newPlanName,
			"subscription_operator": string(types.SubscriptionTransactionTypeDowngraded),
			"transaction_id":        transactionID.String(),
		},
		ProrationBehavior: stripe.String(stripe.SubscriptionSchedulePhaseProrationBehaviorAlwaysInvoice),
		//PaymentBehavior:   stripe.String(string(stripe.SubscriptionPaymentBehaviorDefaultIncomplete)),
	}

	updatedSub, err := subscription.Update(subscriptionID, params)
	if err != nil {
		return nil, fmt.Errorf("subscription.Update: %v", err)
	}

	return updatedSub, nil
}

func (s *StripeService) UpdatePlanPricePreview(subscriptionID, newPriceID string) (int64, error) {
	return s.UpdatePlanPricePreviewWithDiscount(subscriptionID, newPriceID, "")
}

// UpdatePlanPricePreviewWithDiscount previews subscription price changes with optional discount code
func (s *StripeService) UpdatePlanPricePreviewWithDiscount(subscriptionID, newPriceID, discountCode string) (int64, error) {
	// Retrieve the current subscription
	sub, err := subscription.Get(subscriptionID, nil)
	if err != nil {
		return 0, fmt.Errorf("subscription.Get: %v", err)
	}

	if len(sub.Items.Data) == 0 {
		return 0, fmt.Errorf("subscription has no items to update")
	}

	params := &stripe.InvoiceCreatePreviewParams{
		Subscription: &subscriptionID,
		SubscriptionDetails: &stripe.InvoiceCreatePreviewSubscriptionDetailsParams{
			Items: []*stripe.InvoiceCreatePreviewSubscriptionDetailsItemParams{
				{
					ID:    &sub.Items.Data[len(sub.Items.Data)-1].ID,
					Price: stripe.String(newPriceID),
				},
			},
			//ProrationDate:         stripe.Int64(time.Now().UTC().Unix()),
			ProrationBehavior:     stripe.String("create_prorations"),
			BillingCycleAnchorNow: stripe.Bool(true),
			// Ensure billing cycle anchors to now for upgrade
			//BillingCycleAnchor: stripe.Int64(time.Now().UTC().Unix()),
		},
	}

	// Add discount code if provided
	if discountCode != "" {
		params.Discounts = []*stripe.InvoiceCreatePreviewDiscountParams{
			{
				Coupon: stripe.String(discountCode),
			},
		}
	}

	inv, err := s.UpdatePreview(params)
	if err != nil {
		return 0, fmt.Errorf("failed to get Stripe invoice preview: %v", err)
	}
	// Find the first positive line item amount
	firstAmount := int64(0)
	for _, line := range inv.Lines.Data {
		firstAmount += line.Amount
		if line.Amount > 0 {
			return firstAmount, nil
		}
	}

	return 0, fmt.Errorf("not found upgrade amount")
}

// getOrCreatePrice creates or retrieves a price using lookup key pattern
func (s *StripeService) getOrCreatePrice(planName, period string, amount int64, currency string) (string, error) {
	// Create lookup key for the price following Stripe best practices
	lookupKey := fmt.Sprintf("workspace_subscription_%s_%s", planName, period)

	// Try to find existing price with lookup key
	params := &stripe.PriceListParams{
		LookupKeys: stripe.StringSlice([]string{lookupKey}),
	}

	iter := price.List(params)
	for iter.Next() {
		p := iter.Price()
		if p.UnitAmount == amount && string(p.Currency) == currency {
			return p.ID, nil
		}
	}

	// Create product first if it doesn't exist
	productID, err := s.getOrCreateProduct(planName)
	if err != nil {
		return "", fmt.Errorf("failed to get/create product: %v", err)
	}

	// Create new price with lookup key
	interval := "month"
	if period == "1y" {
		interval = "year"
	}

	priceParams := &stripe.PriceParams{
		Product:    stripe.String(productID),
		UnitAmount: stripe.Int64(amount),
		Currency:   stripe.String(currency),
		LookupKey:  stripe.String(lookupKey),
		Recurring: &stripe.PriceRecurringParams{
			Interval: stripe.String(interval),
		},
	}

	p, err := price.New(priceParams)
	if err != nil {
		return "", fmt.Errorf("price.New: %v", err)
	}

	return p.ID, nil
}

// getOrCreateProduct creates or retrieves a product
func (s *StripeService) getOrCreateProduct(planName string) (string, error) {
	productName := fmt.Sprintf("Workspace Subscription - %s", planName)

	// Try to find existing product
	params := &stripe.ProductListParams{}
	params.Filters.AddFilter("active", "", "true")

	iter := product.List(params)
	for iter.Next() {
		prod := iter.Product()
		if prod.Name == productName {
			return prod.ID, nil
		}
	}

	// Create new product if not found
	productParams := &stripe.ProductParams{
		Name:        stripe.String(productName),
		Description: stripe.String(fmt.Sprintf("Workspace subscription plan: %s", planName)),
	}

	prod, err := product.New(productParams)
	if err != nil {
		return "", fmt.Errorf("product.New: %v", err)
	}

	return prod.ID, nil
}

// GetCheckoutSession retrieves a checkout session following user's pattern
func (s *StripeService) GetCheckoutSession(sessionID string) (*stripe.CheckoutSession, error) {
	checkoutSession, err := checkoutsession.Get(sessionID, nil)
	if err != nil {
		return nil, fmt.Errorf("stripe.GetCheckoutSession: %v", err)
	}
	return checkoutSession, nil
}

// HandleWebhook processes Stripe webhook events following official pattern
func (s *StripeService) HandleWebhook(payload []byte, signature string) (*stripe.Event, error) {
	if s.WebhookSecret == "" {
		return nil, fmt.Errorf("webhook secret not configured")
	}

	// Verify webhook signature using official SDK
	event, err := webhook.ConstructEvent(payload, signature, s.WebhookSecret)
	if err != nil {
		return nil, fmt.Errorf("webhook.ConstructEvent: %v", err)
	}

	return &event, nil
}

// CreatePortalSession creates a customer portal session for subscription management
func (s *StripeService) CreatePortalSession(customerID string) (*stripe.BillingPortalSession, error) {
	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(s.Domain),
	}

	ps, err := portalsession.New(params)
	if err != nil {
		return nil, fmt.Errorf("portalsession.New: %v", err)
	}

	return ps, nil
}

// CreateSubscriptionPortalSession creates a customer portal session for managing a specific subscription
func (s *StripeService) CreateSubscriptionPortalSession(customerID, subscriptionID string, redirectUrl *string) (*stripe.BillingPortalSession, error) {
	// Create a custom request to filter the portal session to specific subscriptions
	// We'll use flow_data to restrict the portal to payment method updates only
	if redirectUrl == nil {
		logrus.Error("redirectUrl is required")
		redirectUrl = stripe.String(s.Domain + "/?openapp=system-costcenter")
	}
	params := &stripe.BillingPortalSessionParams{
		Customer: stripe.String(customerID),
		// ReturnURL: stripe.String(s.Domain + "/?openapp=system-costcenter"),
		FlowData: &stripe.BillingPortalSessionFlowDataParams{
			AfterCompletion: &stripe.BillingPortalSessionFlowDataAfterCompletionParams{
				Type: stripe.String("redirect"),
				Redirect: &stripe.BillingPortalSessionFlowDataAfterCompletionRedirectParams{
					ReturnURL: redirectUrl,
				},
			},
			Type: stripe.String("payment_method_update"),
		},
	}

	ps, err := portalsession.New(params)
	if err != nil {
		return nil, fmt.Errorf("portalsession.New: %v", err)
	}

	return ps, nil
}

func (s *StripeService) CreateSubscriptionSetupIntent(customerID, subscriptionID string, redirectUrl *string) (*stripe.CheckoutSession, error) {
	if redirectUrl == nil {
		redirectUrl = stripe.String(s.Domain + "/?openapp=system-costcenter")
	}
	// Missing required param: currency.\",\"param\":\"currency\",
	params := &stripe.CheckoutSessionParams{
		Mode:     stripe.String("setup"),
		Currency: stripe.String("USD"),
		Customer: stripe.String(customerID),
		//PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		SetupIntentData: &stripe.CheckoutSessionSetupIntentDataParams{
			Metadata: map[string]string{
				"subscription_id": subscriptionID, // 传给 webhook 用
			},
		},
		SuccessURL: redirectUrl,
		CancelURL:  redirectUrl,
	}
	cs, err := checkoutsession.New(params)
	if err != nil {
		return nil, fmt.Errorf("checkoutsession.New: %v", err)
	}
	return cs, nil
}

// CreateCustomer creates a new Stripe customer
//func (s *StripeService) CreateCustomer(userUID, email string) (*stripe.Customer, error) {
//	params := &stripe.CustomerParams{
//		Metadata: map[string]string{
//			"user_uid": userUID,
//		},
//	}
//
//	if email != "" {
//		params.Email = stripe.String(email)
//	}
//
//	cust, err := customer.New(params)
//	if err != nil {
//		return nil, fmt.Errorf("customer.New: %v", err)
//	}
//
//	return cust, nil
//}

// GetCustomerByUID finds customer by user UID in metadata
func (s *StripeService) GetCustomerByUID(userUID string) (*stripe.Customer, error) {
	params := &stripe.CustomerSearchParams{
		SearchParams: stripe.SearchParams{
			Query:  fmt.Sprintf("metadata['user_uid']:'%s'", userUID),
			Limit:  stripe.Int64(1),
			Single: true,
		},
	}
	result := customer.Search(params)
	if result.Err() != nil {
		return nil, fmt.Errorf("customer.Search: %v", result.Err())
	}
	if result.Next() {
		return result.Customer(), nil
	}

	return nil, gorm.ErrRecordNotFound
}

// GetSubscription retrieves a Stripe subscription
func (s *StripeService) GetSubscription(subscriptionID string) (*stripe.Subscription, error) {
	sub, err := subscription.Get(subscriptionID, nil)
	if err != nil {
		return nil, fmt.Errorf("subscription.Get: %v", err)
	}
	return sub, nil
}

// GetSubscriptionCurrentPeriodEnd time retrieves the current period end time of a subscription
func (s *StripeService) GetSubscriptionCurrentPeriodEnd(subscriptionID string) (time.Time, error) {
	sub, err := s.GetSubscription(subscriptionID)
	if err != nil {
		return time.Time{}, err
	}
	if len(sub.Items.Data) == 0 {
		return time.Time{}, fmt.Errorf("subscription has no items")
	}
	item := sub.Items.Data[len(sub.Items.Data)-1]
	return time.Unix(item.CurrentPeriodEnd, 0), nil
}

// CancelSubscription cancels a Stripe subscription
func (s *StripeService) CancelSubscription(subscriptionID string) (*stripe.Subscription, error) {
	//sub, err := subscription.Get(subscriptionID, nil)
	//if err != nil {
	//	return nil, fmt.Errorf("subscription.Get: %v", err)
	//}

	// 先查找是否存在

	sub, err := subscription.Cancel(subscriptionID, &stripe.SubscriptionCancelParams{
		InvoiceNow: stripe.Bool(true),
	})
	if err != nil && !strings.Contains(err.Error(), "No such subscription") {
		sub, _ = subscription.Get(subscriptionID, nil)
		if sub != nil && sub.Status == stripe.SubscriptionStatusCanceled {
			return sub, nil
		}
		return sub, fmt.Errorf("subscription.Cancel: %v", err)
	}
	return sub, nil
}

// UpdateSubscription updates a Stripe subscription
func (s *StripeService) UpdateSubscription(subscriptionID string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
	sub, err := subscription.Update(subscriptionID, params)
	if err != nil {
		return nil, fmt.Errorf("subscription.Update: %v", err)
	}
	return sub, nil
}

func (s *StripeService) UpdatePreview(params *stripe.InvoiceCreatePreviewParams) (*stripe.Invoice, error) {
	inv, err := invoice.CreatePreview(params)
	if err != nil {
		return nil, fmt.Errorf("invoice.CreatePreview: %v", err)
	}
	return inv, nil
}

// GetPrice retrieves a Stripe price by ID
func (s *StripeService) GetPrice(priceID string) (*stripe.Price, error) {
	p, err := price.Get(priceID, nil)
	if err != nil {
		return nil, fmt.Errorf("price.Get: %v", err)
	}
	return p, nil
}

// ListPrices lists Stripe prices with optional filters
func (s *StripeService) ListPrices(activeOnly bool) ([]*stripe.Price, error) {
	params := &stripe.PriceListParams{}
	if activeOnly {
		params.Filters.AddFilter("active", "", "true")
	}

	var prices []*stripe.Price
	iter := price.List(params)
	for iter.Next() {
		prices = append(prices, iter.Price())
	}
	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("price.List: %v", err)
	}

	return prices, nil
}

// ParseWebhookEventData parses webhook event data into specific Stripe objects
// This only handles Stripe API parsing, no database operations
func (s *StripeService) ParseWebhookEventData(event *stripe.Event) (interface{}, error) {
	switch event.Type {
	case "checkout.session.completed", "checkout.session.expired":
		var sess stripe.CheckoutSession
		err := json.Unmarshal(event.Data.Raw, &sess)
		if err != nil {
			return nil, fmt.Errorf("error parsing checkout session: %v", err)
		}
		return &sess, nil

	case "customer.subscription.created":
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			return nil, fmt.Errorf("error parsing subscription: %v", err)
		}
		return &sub, nil

	case "customer.subscription.updated":
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			return nil, fmt.Errorf("error parsing subscription: %v", err)
		}
		return &sub, nil

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			return nil, fmt.Errorf("error parsing subscription: %v", err)
		}
		return &sub, nil

	case "customer.subscription.trial_will_end":
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			return nil, fmt.Errorf("error parsing subscription: %v", err)
		}
		return &sub, nil

	case "invoice.payment_succeeded", "invoice.payment_failed", "invoice.paid":
		var in stripe.Invoice
		err := json.Unmarshal(event.Data.Raw, &in)
		if err != nil {
			return nil, fmt.Errorf("error parsing invoice: %v", err)
		}
		return &in, nil

	case "setup_intent.succeeded":
		var si stripe.SetupIntent
		err := json.Unmarshal(event.Data.Raw, &si)
		if err != nil {
			return nil, fmt.Errorf("error parsing setup intent: %v", err)
		}
		return &si, nil

	default:
		return nil, fmt.Errorf("unhandled event type: %s", event.Type)
	}
}

// Helper methods for customer management

// CreateCustomer creates a new Stripe customer
//func (s *StripeService) CreateCustomer(userUID, email string) (*stripe.Customer, error) {
//	params := &stripe.CustomerParams{
//		Params: stripe.Params{
//			Metadata: map[string]string{
//				"user_uid": userUID,
//			},
//		},
//	}
//
//	if email != "" {
//		params.Email = stripe.String(email)
//	}
//
//	cust, err := customer.New(params)
//	if err != nil {
//		return nil, fmt.Errorf("customer.New: %v", err)
//	}
//
//	return cust, nil
//}

// GetOrCreateCustomer gets existing customer or creates new one
func (s *StripeService) GetCustomer(userUID, email string) (*stripe.Customer, error) {
	// Try to find existing customer
	cust, err := s.GetCustomerByUID(userUID)
	if err == nil {
		return cust, nil
	}
	return nil, fmt.Errorf("customer not found for user_uid: %s", userUID)
}

// Global StripeService instance
var StripeServiceInstance *StripeService

// GetCustomerPaymentMethods retrieves all payment methods for a customer
func (s *StripeService) GetCustomerPaymentMethods(customerID string) ([]*stripe.PaymentMethod, error) {
	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(customerID),
		Type:     stripe.String("card"),
	}

	var paymentMethods []*stripe.PaymentMethod
	iter := paymentmethod.List(params)
	for iter.Next() {
		paymentMethods = append(paymentMethods, iter.PaymentMethod())
	}
	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("paymentmethod.List: %v", err)
	}

	return paymentMethods, nil
}

// GetCustomerInvoices retrieves all invoices for a customer
func (s *StripeService) GetCustomerInvoices(customerID string, limit int64) ([]*stripe.Invoice, error) {
	params := &stripe.InvoiceListParams{
		Customer: stripe.String(customerID),
	}
	if limit > 0 {
		params.Limit = stripe.Int64(limit)
	}

	var invoices []*stripe.Invoice
	iter := invoice.List(params)
	for iter.Next() {
		invoices = append(invoices, iter.Invoice())
	}
	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("invoice.List: %v", err)
	}

	return invoices, nil
}

// GetPaymentMethod retrieves a specific payment method by ID
func (s *StripeService) GetPaymentMethod(paymentMethodID string) (*stripe.PaymentMethod, error) {
	pm, err := paymentmethod.Get(paymentMethodID, nil)
	if err != nil {
		return nil, fmt.Errorf("paymentmethod.Get: %v", err)
	}
	return pm, nil
}

// InitStripeService initializes the global Stripe service
func InitStripeService() {
	if os.Getenv("STRIPE_SECRET_KEY") != "" {
		StripeServiceInstance = NewStripeService()
	}
}
