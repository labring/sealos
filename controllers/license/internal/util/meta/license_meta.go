package meta

import (
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
)

// Meta is the license metadata, which will be stored in database

type Meta struct {
	Token          string `bson:"token"`
	ActivationTime string `bson:"activationTime"`
}

func New(license *licensev1.License) *Meta {
	return &Meta{
		Token:          license.Spec.Token,
		ActivationTime: license.Status.ActivationTime.Format("2006-01-02 15:04:05"),
	}
}
