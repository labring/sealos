package common

import (
	"flag"
	"os"
	"path/filepath"

	log "github.com/sirupsen/logrus"
)

var (
	Port   = flag.Int("port", 3000, "the listening port")
	LogDir = flag.String("log-dir", "", "specify the log directory")
)

func Init() {
	flag.Parse()

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
	}
}
