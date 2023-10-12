package controller

import (
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/labring/sealos/controllers/license/internal/util"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LicenseRecorder struct {
	// maybe you need more or less information to record license, add/delete if you need
	client.Client
	db *util.DataBase
}

// TODO fix this

func (r *LicenseRecorder) Store(license licensev1.License) error {
	return nil
}

func (r *LicenseRecorder) Get(license licensev1.License) (licensev1.License, bool, error) {
	return licensev1.License{}, false, nil
}
