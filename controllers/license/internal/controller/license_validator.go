package controller

import (
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"

	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LicenseValidator struct {
	client.Client
}

func (v *LicenseValidator) Validate(license *licensev1.License) (bool, error) {
	return licenseutil.IsLicenseValid(license)
}
