package conv

import "unsafe"

func AsString(v any) string {
	str, _ := v.(string)
	return str
}

// The change of bytes will cause the change of string synchronously
func BytesToString(b []byte) string {
	return unsafe.String(unsafe.SliceData(b), len(b))
}

// If string is readonly, modifying bytes will cause panic
func StringToBytes(s string) []byte {
	return unsafe.Slice(unsafe.StringData(s), len(s))
}
