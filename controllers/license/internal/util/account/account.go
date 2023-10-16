package account

import (
	"context"
	"errors"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/license/internal/util/tools"
	count "github.com/labring/sealos/controllers/pkg/account"
	"github.com/labring/sealos/controllers/pkg/crypto"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func Recharge(ctx context.Context, client client.Client, account accountv1.Account, payload map[string]interface{}) error {
	if !tools.ContainsFields(payload, "amt") {
		return nil
	}
	amount, ok := payload["amt"].(int64)
	if !ok {
		amount = 0
		return errors.New("cannot convert value of type to int64")
	}
	charge := amount * count.CurrencyUnit
	account.Status.Balance += charge
	err := crypto.RechargeBalance(account.Status.EncryptBalance, charge)
	if err != nil {
		logger.Error(err, "Failed to crypto the account balance")
		return err
	}
	err = client.Status().Update(ctx, &account)
	if err != nil {
		logger.Error("Recharge Failed, failed to modify the status")
		return err
	}
	return nil
}
