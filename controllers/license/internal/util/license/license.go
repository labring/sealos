package license

import (
	"time"

	"github.com/golang-jwt/jwt/v4"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
)

type License struct {
	Token      string     `bson:"token"`
	CreateTime string     `bson:"createTime"`
	Payload    jwt.Claims `bson:"payload"`
}

func NewLicense(license *licensev1.License, payloadjwt.Claims) License {
	return License{
		Token:      license.Spec.Token,
		CreateTime: time.Now().Format("2006-01-02 15:04:05"),
		Payload:    payload,
	}
}
