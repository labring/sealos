package controller

import (
	"encoding/base64"
	"errors"

	"github.com/dgrijalva/jwt-go"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/labring/sealos/controllers/license/internal/util/database"
	"github.com/labring/sealos/controllers/license/internal/util/tools"
	"github.com/labring/sealos/controllers/pkg/crypto"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LicenseValidator struct {
	// maybe you need more or less information to validate license, add/delete if you need
	client.Client
	db *database.DataBase
}

func (v *LicenseValidator) Validate(license *licensev1.License) (jwt.MapClaims, bool, error) {
	// TODO validate license
	// step1: check if license type matches license mode (P2)
	// step2: check if license token and key is valid (P1)
	switch license.Spec.Type {
	case licensev1.AccountLicenseType:
		// AccountLicense Validate
		// TODO check if license type matches license mode

		// Check if the license is valid
		license.Spec.Key = tools.DecodeKey
		payload, valid := IsLicenseValid(license, tools.DecodeKey)
		if !valid {
			return nil, false, errors.New("The license provided appears to be invalid. Please verify and try again.")
		}
		return payload, true, nil
	case licensev1.ClusterLicenseType:
		// TODO
	}
	return nil, true, nil
}

func IsLicenseValid(license *licensev1.License, DecodeKey string) (jwt.MapClaims, bool) {
	decodeKey, err := base64.StdEncoding.DecodeString(DecodeKey)
	if err != nil {
		return nil, false
	}
	publicKey, err := crypto.ParseRSAPublicKeyFromPEM(string(decodeKey))
	//fmt.Println(string(decodeKey))
	if err != nil {
		return nil, false
	}
	keyFunc := func(token *jwt.Token) (interface{}, error) {
		return publicKey, nil
	}
	parsedToken, err := jwt.Parse(license.Spec.Token, keyFunc)
	if err != nil {
		return nil, false
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if ok && parsedToken.Valid {
		return claims, ok
	}
	return nil, false
}
