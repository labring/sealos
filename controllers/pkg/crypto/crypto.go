/*
Copyright 2023.

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

package crypto

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"

	jwt "github.com/golang-jwt/jwt/v4"
	v1 "github.com/labring/sealos/controllers/cloud/api/v1"
)

//const field = "amt"

func IsLicenseValid(license v1.License) (map[string]interface{}, bool) {
	publicKey, err := parseRSAPublicKeyFromPEM(license.Spec.Key)
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
