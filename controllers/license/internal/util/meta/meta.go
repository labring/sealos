package meta

import (
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	claimsutil "github.com/labring/sealos/controllers/license/internal/util/claims"
	errors "github.com/labring/sealos/controllers/license/internal/util/errors"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"
)

// Meta is the license metadata, which will be stored in database

type Meta struct {
	Token          string            `bson:"token"`
	ActivationTime string            `bson:"activationTime"`
	Claims         claimsutil.Claims `bson:"claims"`
}

func New(license *licensev1.License) (*Meta, error) {
	token, err := licenseutil.ParseLicenseToken(license)
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(claimsutil.Claims)
	if !ok {
		return nil, errors.ClaimsConventError
	}
	return &Meta{
		Token:          license.Spec.Token,
		ActivationTime: license.Status.ActivationTime.Format("2006-01-02 15:04:05"),
		Claims:         claims,
	}, nil
}
