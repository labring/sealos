package controller

import (
	"errors"

	"github.com/labring/sealos/controllers/license/internal/util/database"
	licenseUtil "github.com/labring/sealos/controllers/license/internal/util/license"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LicenseRecorder struct {
	// maybe you need more or less information to record license, add/delete if you need
	client.Client
	db *database.DataBase
}

func (r *LicenseRecorder) Store(license licenseUtil.License) error {
	err := r.db.StoreLicense(license)
	if err != nil {
		return errors.New("failed to store license")
	}
	return nil
}

func (r *LicenseRecorder) GetLicense(token string) (licenseUtil.License, bool, error) {
	license, err := r.db.GetLicense(token)
	if err != nil {
		return licenseUtil.License{}, false, errors.New("failed to get license")
	}
	return license, true, nil
}
