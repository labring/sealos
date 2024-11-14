package random

import (
	"math/rand"
	"strings"

	"github.com/google/uuid"
	"github.com/labring/sealos/service/aiproxy/common/conv"
)

func GetUUID() string {
	code := uuid.New().String()
	code = strings.Replace(code, "-", "", -1)
	return code
}

const (
	keyChars   = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	keyNumbers = "0123456789"
)

func GenerateKey() string {
	key := make([]byte, 48)
	for i := 0; i < 16; i++ {
		key[i] = keyChars[rand.Intn(len(keyChars))]
	}
	uuid := GetUUID()
	for i := 0; i < 32; i++ {
		c := uuid[i]
		if i%2 == 0 && c >= 'a' && c <= 'z' {
			c = c - 'a' + 'A'
		}
		key[i+16] = c
	}
	return conv.BytesToString(key)
}

func GetRandomString(length int) string {
	key := make([]byte, length)
	for i := 0; i < length; i++ {
		key[i] = keyChars[rand.Intn(len(keyChars))]
	}
	return conv.BytesToString(key)
}

func GetRandomNumberString(length int) string {
	key := make([]byte, length)
	for i := 0; i < length; i++ {
		key[i] = keyNumbers[rand.Intn(len(keyNumbers))]
	}
	return conv.BytesToString(key)
}

// RandRange returns a random number between min and max (max is not included)
func RandRange(_min, _max int) int {
	return _min + rand.Intn(_max-_min)
}
