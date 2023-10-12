package controller

import (
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/labring/sealos/controllers/license/internal/util"

	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LicenseValidator struct {
	// maybe you need more or less information to validate license, add/delete if you need
	client.Client
	db *util.DataBase
}

func (v *LicenseValidator) Validate(license licensev1.License) (bool, error) {
	// TODO validate license
	// step1: check if license type matches license mode (P2)
	// step2: check if license token and key is valid (P1)
	return true, nil
}
