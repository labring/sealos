//go:build !linux
// +build !linux

package sync

func reexecIfNecessaryForImages(inputImageNames ...string) error {
	return nil
}
