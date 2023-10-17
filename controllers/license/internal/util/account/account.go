package account

import (
	"context"
	"errors"
	"github.com/labring/sealos/controllers/pkg/crypto"
	"strings"

	"github.com/golang-jwt/jwt/v4"

	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"
	"github.com/labring/sealos/controllers/license/internal/util/tools"
	count "github.com/labring/sealos/controllers/pkg/account"
)

// Recharge account balance by using license
func Recharge(ctx context.Context, client client.Client, license *licensev1.License) error {
	account := &accountv1.Account{}
	namespacedName := types.NamespacedName{
		Namespace: license.Namespace,
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

	// TODO test this
	payload, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return errors.New("cannot convert value of type to jwt.MapClaims")
	}

	if !tools.ContainsFields(payload, "amt") {
		return errors.New("cannot find field amt in license token")
	}

	amount, ok := payload["amt"].(int64)
	if !ok {
		return errors.New("cannot convert amt value of type to int64")
	}
	account.Status.Balance += amount * count.CurrencyUnit

	if err := crypto.RechargeBalance(account.Status.EncryptBalance, amount*count.CurrencyUnit); err != nil {
		return err
	}
	if err := client.Status().Update(ctx, account); err != nil {
		return err
	}
	return nil
}

func GetNameByNameSpace(ns string) string {
	return strings.TrimLeft(ns, "ns-")
}
