package account

import (
	"context"
	"strings"

	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	claimsutil "github.com/labring/sealos/controllers/license/internal/util/claims"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"
	count "github.com/labring/sealos/controllers/pkg/account"
	"github.com/labring/sealos/controllers/pkg/crypto"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
)

const Namespace = "sealos-system"

// Recharge account balance by using license
func Recharge(ctx context.Context, client client.Client, license *licensev1.License) error {
	account := &accountv1.Account{}
	namespacedName := types.NamespacedName{
		Namespace: Namespace,
		Name:      GetNameByNameSpace(license.Namespace),
	}

	err := client.Get(ctx, namespacedName, account)
	if err != nil {
		return err
	}

	claims, err := licenseutil.GetClaims(license)
	if err != nil {
		return err
	}

	var data = &claimsutil.AccountClaimData{}
	if err := claims.Data.SwitchToAccountData(data); err != nil {
		return err
	}

	logger.Info("recharge account", "account", account.Name, "amount", data.Amount)

	account.Status.Balance += data.Amount * count.CurrencyUnit
	if err := crypto.RechargeBalance(account.Status.EncryptBalance, data.Amount*count.CurrencyUnit); err != nil {
		return err
	}
	return client.Status().Update(ctx, account)
}

func GetNameByNameSpace(ns string) string {
	return strings.TrimPrefix(ns, "ns-")
}
