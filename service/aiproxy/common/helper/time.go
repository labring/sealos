package helper

import (
	"time"
)

func GetTimestamp() int64 {
	return time.Now().Unix()
}
