package common

import (
	"flag"
	"log"
	"os"
	"path/filepath"

	"github.com/labring/sealos/service/aiproxy/common/logger"
)

var (
	Port   = flag.Int("port", 3000, "the listening port")
	LogDir = flag.String("log-dir", "", "specify the log directory")
)

func Init() {
	flag.Parse()

	if os.Getenv("SQLITE_PATH") != "" {
		SQLitePath = os.Getenv("SQLITE_PATH")
	}
	if *LogDir != "" {
		var err error
		*LogDir, err = filepath.Abs(*LogDir)
		if err != nil {
			log.Fatal(err)
		}
		if _, err := os.Stat(*LogDir); os.IsNotExist(err) {
			err = os.Mkdir(*LogDir, 0o777)
			if err != nil {
				log.Fatal(err)
			}
		}
		logger.LogDir = *LogDir
	}
}
