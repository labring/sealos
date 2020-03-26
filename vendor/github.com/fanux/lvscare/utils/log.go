package utils

import "fmt"

var logConfig = `{
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
func Config(level string) string {
	return fmt.Sprintf(logConfig, level)
}
