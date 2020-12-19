package logger

import (
	"encoding/json"
	"runtime"
)

//二次开发logger
func Cfg(level int) {
	config := logConfig{
		TimeFormat: "15:04:05",
		Console: &consoleLogger{
			LogLevel: level,
			Colorful: runtime.GOOS != "windows",
		},
	}
	cfg, _ := json.Marshal(config)
	SetLogger(string(cfg))
	SetLogPath(true)
}
