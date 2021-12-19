package settings

import (
	"os"
	"path/filepath"
	"time"

	"github.com/mitchellh/go-homedir"
)

const (
	SealerBinPath      = "/usr/local/bin/sealos"
	SubCmdInitOfSealos = "init"
	DefaultSSHPassword = "Sealos123"
)

const (
	FileMode0755 = 0755
	FileMode0644 = 0644
)

var (
	DefaultPollingInterval time.Duration
	MaxWaiteTime           time.Duration
	DefaultWaiteTime       time.Duration
	DefaultSealosBin       = ""
	DefaultTestEnvDir      = ""

	AccessKey    = os.Getenv("ACCESSKEYID")
	AccessSecret = os.Getenv("ACCESSKEYSECRET")
)

func GetWorkDir() string {
	home, err := homedir.Dir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".sealos")
}
