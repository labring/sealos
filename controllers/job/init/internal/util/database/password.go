package database

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"os"
)

var (
	saltKey = os.Getenv("SaltKey")
)

func hashPassword(password string) (string, error) {
	hash := sha256.New()
	validSalt, err := base64.StdEncoding.DecodeString(saltKey)
	if err != nil {
		return "", err
	}
	hash.Write([]byte(password + string(validSalt)))
	return hex.EncodeToString(hash.Sum(nil)), nil
}
