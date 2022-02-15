package utils

import (
	"github.com/sealyun/lvscare/internal/glog"
)

func Config(level string) {
	//flag.Parse()
	switch level {
	case "INFO":
		glog.InitVerbosity(0)
	case "DEBG":
		glog.InitVerbosity(9)
	default:
		glog.InitVerbosity(0)
	}

}
