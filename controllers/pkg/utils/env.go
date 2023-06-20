package utils

import (
	"os"
	"strconv"
)

func GetEnvWithDefault(key, defaultValue string) string {
	value, ok := os.LookupEnv(key)
	if !ok || value == "" {
		return defaultValue
	}
	return value
}

func GetIntEnvWithDefault(key string, defaultValue int64) int64 {
	env, ok := os.LookupEnv(key)
	if !ok || env == "" {
		return defaultValue
	}
	value, err := strconv.ParseInt(env, 10, 64)
	if err != nil {
		return defaultValue
	}
	return value
}
