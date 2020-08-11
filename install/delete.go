package install

import (
	"fmt"
	"github.com/wonderivan/logger"
	"os"
)

// APPDelete is delete APP installed by sealos
func APPDelete(url string) {
	c := &SealConfig{}
	err := c.Load("")
	if err != nil {
		logger.Error(err)
		c.ShowDefaultConfig()
		os.Exit(0)
	}
	var p *PkgConfig
	if PackageConfig == "" {
		p, err = LoadConfig(url)
		if err != nil {
			logger.Error("load config failed: %s", err)
			os.Exit(0)
		}
	} else {
		f, err := os.Open(PackageConfig)
		if err != nil {
			logger.Error("load config failed: %s", err)
			os.Exit(0)
		}
		p, err = configFromReader(f)
	}
	p.URL = url
	p.Name = nameFromUrl(url)
	p.Workdir = Workdir

	// 删除APP默认需要进行交互式确认。
	if !CleanForce {
		prompt := fmt.Sprintf("deletew command will del your installed %s App , continue delete (y/n)?", p.Name)
		result := Confirm(prompt)
		if !result {
			logger.Info("delete  %s App is skip, Exit", p.Name)
			os.Exit(-1)
		}
	}
	p.Flag = "delete"
	Exec(p, *c)
}
