package controller

import (
	"context"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	accountutil "github.com/labring/sealos/controllers/license/internal/util/account"

	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LicenseActivator struct {
	client.Client
}

func (a *LicenseActivator) Active(ctx context.Context, license *licensev1.License) error {
	// TODO mv to active function
	switch license.Spec.Type {
	case licensev1.AccountLicenseType:
		if err := accountutil.Recharge(ctx, a.Client, license); err != nil {
			return err
		}
	case licensev1.ClusterLicenseType:
		// TODO implement cluster license
	}
	return nil
}
