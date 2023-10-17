package license

import (
	"encoding/base64"
	"github.com/golang-jwt/jwt/v4"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/labring/sealos/controllers/license/internal/util/key"
	"github.com/labring/sealos/controllers/pkg/crypto"
)

func ParseLicenseToken(license *licensev1.License) (*jwt.Token, error) {
	token, err := jwt.Parse(license.Spec.Token,
		func(token *jwt.Token) (interface{}, error) {
			decodeKey, err := base64.StdEncoding.DecodeString(key.EncryptionKey)
			if err != nil {
				return nil, err
			}
			publicKey, err := crypto.ParseRSAPublicKeyFromPEM(string(decodeKey))
			if err != nil {
				return nil, err
			}
			return publicKey, nil
		})
	if err != nil {
		return nil, err
	}
	return token, nil
}

func IsLicenseValid(license *licensev1.License) (bool, error) {
	token, err := ParseLicenseToken(license)
	if err != nil {
		return false, err
	}
	return token.Valid, nil
}
