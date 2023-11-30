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
)

const defaultEncryptionKey = "0123456789ABCDEF0123456789ABCDEF"

var encryptionKey = defaultEncryptionKey

// Encrypt encrypts the given plaintext using AES-GCM.
func Encrypt(plaintext []byte) (string, error) {
	return EncryptWithKey(plaintext, []byte(encryptionKey))
}

// EncryptWithKey encrypts the given plaintext using AES-GCM.
func EncryptWithKey(plaintext []byte, encryptionKey []byte) (string, error) {
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

// EncryptWithKey encrypts the given plaintext using AES-GCM.
func EncryptInt64WithKey(in int64, encryptionKey []byte) (*string, error) {
	out, err := EncryptWithKey([]byte(strconv.FormatInt(in, 10)), encryptionKey)
	return &out, err
}

func DecryptInt64(in string) (int64, error) {
	out, err := Decrypt(in)
	if err != nil {
		return 0, fmt.Errorf("failed to decrpt balance: %w", err)
	}
	return strconv.ParseInt(string(out), 10, 64)
}

func DecryptFloat64(in string) (float64, error) {
	out, err := Decrypt(in)
	if err != nil {
		return 0, fmt.Errorf("failed to decrpt balance: %w", err)
	}
	return strconv.ParseFloat(string(out), 64)
}

func EncryptFloat64(in float64) (*string, error) {
	out, err := Encrypt([]byte(strconv.FormatFloat(in, 'f', -1, 64)))
	return &out, err
}

// DecryptInt64WithKey decrypts the given ciphertext using AES-GCM.
func DecryptInt64WithKey(in string, encryptionKey []byte) (int64, error) {
	out, err := DecryptWithKey(in, encryptionKey)
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
	return DecryptWithKey(ciphertextBase64, []byte(encryptionKey))
}

// DecryptWithKey decrypts the given ciphertext using AES-GCM.
func DecryptWithKey(ciphertextBase64 string, encryptionKey []byte) ([]byte, error) {
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

func ParseRSAPublicKeyFromPEM(keyPEM string) (*rsa.PublicKey, error) {
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
