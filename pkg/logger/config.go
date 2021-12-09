// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package logger

import (
	"encoding/json"
	"runtime"
)

const WINDOWS = "windows"

//二次开发logger
func Cfg(level int, logFIle string) {
	config := logConfig{
		TimeFormat: "15:04:05",
		Console: &consoleLogger{
			LogLevel: level,
			Colorful: runtime.GOOS != WINDOWS,
		},
		File: &fileLogger{
			Filename:   logFIle,
			Level:      "TRAC",
			Daily:      false,
			MaxLines:   1000000,
			MaxSize:    1,
			MaxDays:    -1,
			Append:     true,
			PermitMask: "0660",
		},
	}
	cfg, _ := json.Marshal(config)
	_ = SetLogger(string(cfg))
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
