package common

import (
	"unicode/utf8"

	"github.com/labring/sealos/service/aiproxy/common/conv"
)

func TruncateByRune(s string, length int) string {
	total := 0
	for _, r := range s {
		runeLen := utf8.RuneLen(r)
		if runeLen == -1 || total+runeLen > length {
			return s[:total]
		}
		total += runeLen
	}
	return s[:total]
}

func TruncateBytesByRune(b []byte, length int) []byte {
	total := 0
	for _, r := range conv.BytesToString(b) {
		runeLen := utf8.RuneLen(r)
		if runeLen == -1 || total+runeLen > length {
			return b[:total]
		}
		total += runeLen
	}
	return b[:total]
}
