package utils

import (
	"fmt"
	"github.com/wonderivan/logger"
)

var logConfig = `{
    "TimeFormat":"15:04:05",
	"Console": {
		"level": "%s",
		"color": true
	}
}`

//var LevelMap = map[string]int{
//	"EMER": LevelEmergency,
//	"ALRT": LevelAlert,
//	"CRIT": LevelCritical,
//	"EROR": LevelError,
//	"WARN": LevelWarning,
//	"INFO": LevelInformational,
//	"DEBG": LevelDebug,
//	"TRAC": LevelTrace,
//}
func Config(level string) {
	if level == "" {
		level = "INFO"
	}
	cfg := fmt.Sprintf(logConfig, level)
	logger.SetLogger(string(cfg))
	logger.SetLogPath(true)
}
