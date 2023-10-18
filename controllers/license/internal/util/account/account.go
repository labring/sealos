package account

import (
	"context"
	"errors"
	"strings"

	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	claimsutil "github.com/labring/sealos/controllers/license/internal/util/claims"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"

	count "github.com/labring/sealos/controllers/pkg/account"
	"github.com/labring/sealos/controllers/pkg/crypto"
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

	token, err := licenseutil.ParseLicenseToken(license)
	if err != nil {
		return err
	}

	claims, ok := token.Claims.(claimsutil.Claims)
	if !ok {
		return errors.New("cannot convert value of type to jwt.MapClaims")
	}

	var data = &claimsutil.AccountClaimData{}
	if err := claims.Data.SwitchToAccountData(data); err != nil {
		return err
	}

	account.Status.Balance += data.Amount * count.CurrencyUnit
	if err := crypto.RechargeBalance(account.Status.EncryptBalance, data.Amount*count.CurrencyUnit); err != nil {
		return err
	}
	if err := client.Status().Update(ctx, account); err != nil {
		return err
	}
	return nil
}

func GetNameByNameSpace(ns string) string {
	return strings.TrimPrefix(ns, "ns-")
}
