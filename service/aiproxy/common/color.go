package common

import (
	"os"
	"sync"

	"github.com/mattn/go-isatty"
)

var (
	needColor     bool
	needColorOnce sync.Once
)

func NeedColor() bool {
	needColorOnce.Do(func() {
		needColor = isatty.IsTerminal(os.Stdout.Fd()) || isatty.IsCygwinTerminal(os.Stdout.Fd())
	})
	return needColor
}
