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
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"strconv"

	jwt "github.com/golang-jwt/jwt/v4"
	v1 "github.com/labring/sealos/controllers/cloud/api/v1"
)

var encryptionKey = []byte("0123456789ABCDEF0123456789ABCDEF")

// Encrypt encrypts the given plaintext using AES-GCM.
func Encrypt(plaintext []byte) (string, error) {
	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, 12)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	ciphertext := aesgcm.Seal(nil, nonce, plaintext, nil)
	return base64.StdEncoding.EncodeToString(append(nonce, ciphertext...)), nil
}

func EncryptInt64(in int64) (*string, error) {
	out, err := Encrypt([]byte(strconv.FormatInt(in, 10)))
	return &out, err
}

func DecryptInt64(in string) (int64, error) {
	out, err := Decrypt(in)
	if err != nil {
		return 0, fmt.Errorf("failed to decrpt balance: %w", err)
	}
	return strconv.ParseInt(string(out), 10, 64)
}

func RechargeBalance(rawBalance *string, amount int64) error {
	balanceInt, err := DecryptInt64(*rawBalance)
	if err != nil {
		return fmt.Errorf("failed to recharge balance: %w", err)
	}
	balanceInt += amount
	encryptBalance, err := EncryptInt64(balanceInt)
	if err != nil {
		return fmt.Errorf("failed to recharge balance: %w", err)
	}
	*rawBalance = *encryptBalance
	return nil
}

func DeductBalance(balance *string, amount int64) error {
	balanceInt, err := DecryptInt64(*balance)
	if err != nil {
		return fmt.Errorf("failed to deduct balance: %w", err)
	}
	balanceInt -= amount
	encryptBalance, err := EncryptInt64(balanceInt)
	if err != nil {
		return fmt.Errorf("failed to deduct balance: %w", err)
	}
	*balance = *encryptBalance
	return nil
}

// Decrypt decrypts the given ciphertext using AES-GCM.
func Decrypt(ciphertextBase64 string) ([]byte, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return nil, err
	}

	if len(ciphertext) < 12 {
		return nil, errors.New("ciphertext too short")
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return nil, err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := ciphertext[:12]
	ciphertext = ciphertext[12:]
	plaintext, err := aesgcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}

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
