/*
Copyright 2023 yxxchange@163.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package cloudtool

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"time"

	jwt "github.com/golang-jwt/jwt/v4"
	v1 "github.com/labring/sealos/controllers/cloud/api/v1"
	"github.com/labring/sealos/pkg/utils/logger"
)

type LicenseManager struct {
	Expire int64
	Policy Policy
}

func (lm *LicenseManager) IsLicenseValid(license *v1.License) (int64, bool) {
	publicKey, err := parseRSAPublicKeyFromPEM(license.Spec.Key)
	if err != nil {
		logger.Error("LicenseReconciler: there is no license")
		return 0, false
	}
	keyFunc := func(token *jwt.Token) (interface{}, error) {
		return publicKey, nil
	}
	parsedToken, err := jwt.Parse(license.Spec.Token, keyFunc)
	if err != nil {
		logger.Error("LicenseReconciler: failed to parse the token:", err)
		return 0, false
	}
	if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok && parsedToken.Valid {
		if exp, ok := claims["exp"].(float64); ok {
			expTime := time.Unix(int64(exp), 0)
			now := time.Now()
			if now.After(expTime) {
				logger.Error("token has expired")
				return 0, false
			}
			remainingTime := expTime.Sub(now)
			return int64(remainingTime.Seconds()), true
		}
		logger.Error("not found exp field in token payload")
	}
	return 0, false
}

func parseRSAPublicKeyFromPEM(keyPEM string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, errors.New("failed to parse PEM block containing the public key")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, err
	}

	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, errors.New("key is not of type *rsa.PublicKey")
	}
	return rsaPub, nil
}
