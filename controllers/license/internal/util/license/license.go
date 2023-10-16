package license

import (
	"time"
  
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
)

type License struct {
	Token      string                 `bson:"token"`
	CreateTime string                 `bson:"createTime"`
	Payload    map[string]interface{} `bson:"payload"`
}

func NewLicense(license *licensev1.License, payload map[string]interface{}) License {
	return License{
		Token:      license.Spec.Token,
		CreateTime: time.Now().Format("2006-01-02 15:04:05"),
		Payload:    payload,
	}
}
