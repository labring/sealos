package util

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"
)

// UniquePart copied from github.com/containerd/containerd/rootfs/apply.go
func UniquePart() string {
	t := time.Now()
	var b [3]byte
	// Ignore read failures, just decreases uniqueness
	rand.Read(b[:])
	return fmt.Sprintf("%d-%s", t.Nanosecond(), base64.URLEncoding.EncodeToString(b[:]))
}
