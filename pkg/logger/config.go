package logger

import (
	"encoding/json"
	"runtime"
)

//二次开发logger
func Cfg(level int, logFIle string) {
	config := logConfig{
		TimeFormat: "15:04:05",
		Console: &consoleLogger{
			LogLevel: level,
			Colorful: runtime.GOOS != "windows",
		},
		File: &fileLogger{                  
			Filename: logFIle,  
			Level: "TRAC",       
			Daily: false,         
			MaxLines: 1000000,   
			MaxSize: 1,          
			MaxDays: -1,         
			Append: true,        
			PermitMask: "0660",       
		},
	}
	cfg, _ := json.Marshal(config)
	SetLogger(string(cfg))
	SetLogPath(true)
}

// "File": {                // 文件日志配置
// 	"filename": "app.log",  // 初始日志文件名
// 	"level": "TRAC",        // 日志文件日志输出等级
// 	"daily": true,          // 跨天后是否创建新日志文件，当append=true时有效
// 	"maxlines": 1000000,    // 日志文件最大行数，当append=true时有效
// 	"maxsize": 1,           // 日志文件最大大小，当append=true时有效
// 	"maxdays": -1,          // 日志文件有效期
// 	"append": true,         // 是否支持日志追加
// 	"permit": "0660"        // 新创建的日志文件权限属性
// },