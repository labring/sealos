// +build gofuzz

package sftp

import "bytes"

type sink struct{}

func (*sink) Close() error                { return nil }
func (*sink) Write(p []byte) (int, error) { return len(p), nil }

var devnull = &sink{}

// To run: go-fuzz-build && go-fuzz
func Fuzz(data []byte) int {
	c, err := NewClientPipe(bytes.NewReader(data), devnull)
	if err != nil {
		return 0
	}
	c.Close()
	return 1
}
