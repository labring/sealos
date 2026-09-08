package pay

import (
	"fmt"
	"testing"
	"time"
)

func TestWechatPayment_PaymentAndRefund(t *testing.T) {
	requirePaymentTest(t,
		MchID,
		WechatPrivateKey,
		MchCertificateSerialNumber,
		MchAPIv3Key,
		AppID,
		NotifyCallbackURL,
	)
	// initialize the wechat pay object
	wechatPayment := WechatPayment{}

	user := "test_user"
	amount := int64(10000) // The amount to be paid is in "cents", e.g. 10,000 cents = 100 RMB
	describe := "test_payouts"

	// create a payment order
	tradeNo, codeURL, err := wechatPayment.CreatePayment(amount, user, describe)
	if err != nil {
		t.Fatalf("failed to create a payment order: %v", err)
	}

	// print the payment order information
	fmt.Printf("the payment order has been created successfully\n")
	fmt.Printf("merchant order number %s\n", tradeNo)
	fmt.Printf("payment qr code link %s\n", codeURL)

	time.Sleep(40 * time.Second)

	// check the status of your payment order
	status, paidAmount, err := wechatPayment.GetPaymentDetails(tradeNo)
	if err != nil {
		t.Fatalf("failed to query the payment order: %v", err)
	}

	// print the status of the payment order
	fmt.Printf("payment order status: %s\n", status)
	fmt.Printf("payment amount %d cent\n", paidAmount)

	// determine whether the payment was successful
	// if status != StatusSuccess {
	//	t.Fatalf("The payment was unsuccessful and no refund can be made")
	//}

	// make a refund
	refundOption := RefundOption{
		TradeNo: tradeNo,
		OrderID: tradeNo, // can be set to be the same as the order number
		Amount:  amount,  // refund amount
	}

	// invoke the refund method
	refundNo, refundID, err := wechatPayment.RefundPayment(refundOption)
	if err != nil {
		t.Fatalf("refund failed: %v", err)
	}

	// print the refund information
	fmt.Printf("the refund was successful！\n")
	fmt.Printf("merchant refund number: %s\n", refundNo)
	fmt.Printf("wechat refund number: %s\n", refundID)
}
