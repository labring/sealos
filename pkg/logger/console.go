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
	"os"
	"runtime"
	"sync"
	"time"
)

type brush func(string) string

func newBrush(color string) brush {
	pre := "\033["
	reset := "\033[0m"
	return func(text string) string {
		return pre + color + "m" + text + reset
	}
}

//鉴于终端的通常使用习惯，一般白色和黑色字体是不可行的,所以30,37不可用，
var colors = []brush{
	newBrush("1;41"), // Emergency          红色底
	newBrush("1;35"), // Alert              紫色
	newBrush("1;34"), // Critical           蓝色
	newBrush("1;31"), // Error              红色
	newBrush("1;33"), // Warn               黄色
	newBrush("1;36"), // Informational      天蓝色
	newBrush("1;32"), // Debug              绿色
	newBrush("1;32"), // Trace              绿色
}

type consoleLogger struct {
	sync.Mutex
	Level    string `json:"level"`
	Colorful bool   `json:"color"`
	LogLevel int
}

func (c *consoleLogger) Init(jsonConfig string) error {
	if len(jsonConfig) == 0 {
		return nil
	}
	if len(jsonConfig) == 0 {
		return nil
	}
	//fmt.Printf("consoleWriter Init:%s\n", jsonConfig)
	err := json.Unmarshal([]byte(jsonConfig), c)
	if runtime.GOOS == "windows" {
		c.Colorful = false
	}

	if l, ok := LevelMap[c.Level]; ok {
		c.LogLevel = l
		return nil
	}

	return err
}

func (c *consoleLogger) LogWrite(when time.Time, msgText interface{}, level int) error {
	if level > c.LogLevel {
		return nil
	}
	msg, ok := msgText.(string)
	if !ok {
		return nil
	}
	if c.Colorful {
		msg = colors[level](msg)
	}
	c.printlnConsole(when, msg)
	return nil
}

func (c *consoleLogger) Destroy() {

}

//nolint:unparam
func (c *consoleLogger) printlnConsole(when time.Time, msg string) {
	c.Lock()
	defer c.Unlock()
	os.Stdout.Write(append([]byte(msg), '\n'))
}

func init() {
	Register(AdapterConsole, &consoleLogger{
		LogLevel: LevelDebug,
		Colorful: runtime.GOOS != "windows",
	})
}
