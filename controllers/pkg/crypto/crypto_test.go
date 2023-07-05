package crypto

import (
	"testing"
)

func TestRechargeBalance(t *testing.T) {
	rawInt := int64(100_000_000)
	addInt := int64(200_000_000)
	expectedInt := int64(300_000_000)

	account := createEncryptedAccount(t, rawInt)

	rechargeAccount(t, account, addInt)

	validateAccount(t, account, expectedInt, "recharge balance failed")
}

func TestDeductBalance(t *testing.T) {
	rawInt := int64(300_000_000)
	deductInt := int64(200_000_000)
	expectedInt := int64(100_000_000)

	account := createEncryptedAccount(t, rawInt)

	deductAccount(t, account, deductInt)

	validateAccount(t, account, expectedInt, "deduct balance failed")
}

func createEncryptedAccount(t *testing.T, rawInt int64) *string {
	account, err := EncryptInt64(rawInt)
	if err != nil {
		t.Fatal(err)
	}
	return account
}

func rechargeAccount(t *testing.T, account *string, amount int64) {
	err := RechargeBalance(account, amount)
	if err != nil {
		t.Fatal(err)
	}
}

func deductAccount(t *testing.T, account *string, amount int64) {
	err := DeductBalance(account, amount)
	if err != nil {
		t.Fatal(err)
	}
}

func validateAccount(t *testing.T, account *string, expectedInt int64, errMsg string) {
	decryptedInt, err := DecryptInt64(*account)
	if err != nil {
		t.Fatal(err)
	}
	if decryptedInt != expectedInt {
		t.Fatalf("%s: expected %d, got %d", errMsg, expectedInt, decryptedInt)
	}
}
