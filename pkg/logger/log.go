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
	"fmt"
	"io/ioutil"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"
)

// 默认日志输出
var defaultLogger *LocalLogger

// 日志等级，从0-7，日优先级由高到低
const (
	LevelEmergency     = iota // 系统级紧急，比如磁盘出错，内存异常，网络不可用等
	LevelAlert                // 系统级警告，比如数据库访问异常，配置文件出错等
	LevelCritical             // 系统级危险，比如权限出错，访问异常等
	LevelError                // 用户级错误
	LevelWarning              // 用户级警告
	LevelInformational        // 用户级信息
	LevelDebug                // 用户级调试
	LevelTrace                // 用户级基本输出
)

var LevelMap = map[string]int{
	"EMER": LevelEmergency,
	"ALRT": LevelAlert,
	"CRIT": LevelCritical,
	"EROR": LevelError,
	"WARN": LevelWarning,
	"INFO": LevelInformational,
	"DEBG": LevelDebug,
	"TRAC": LevelTrace,
} // 日志等级和描述映射关系

// 注册实现的适配器， 当前支持控制台，文件和网络输出
var adapters = make(map[string]Logger)

// 日志记录等级字段
var levelPrefix = [LevelTrace + 1]string{
	"EMER",
	"ALRT",
	"CRIT",
	"EROR",
	"WARN",
	"INFO",
	"DEBG",
	"TRAC",
}

const (
	logTimeDefaultFormat = "2006-01-02 15:04:05" // 日志输出默认格式
	AdapterConsole       = "console"             // 控制台输出配置项
	AdapterFile          = "file"                // 文件输出配置项
	AdapterConn          = "conn"                // 网络输出配置项
)

// log provider interface
type Logger interface {
	Init(config string) error
	LogWrite(when time.Time, msg interface{}, level int) error
	Destroy()
}

// 日志输出适配器注册，log需要实现Init，LogWrite，Destroy方法
func Register(name string, log Logger) {
	if log == nil {
		panic("logs: Register provide is nil")
	}
	if _, ok := adapters[name]; ok {
		panic("logs: Register called twice for provider " + name)
	}
	adapters[name] = log
}

type loginfo struct {
	Time    string
	Level   string
	Path    string
	Name    string
	Content string
}

type nameLogger struct {
	Logger
	name   string
	config string
}

type LocalLogger struct {
	lock       sync.Mutex
	init       bool
	outputs    []*nameLogger
	appName    string
	callDepth  int
	timeFormat string
	usePath    bool
}

func NewLogger(depth ...int) *LocalLogger {
	dep := append(depth, 2)[0]
	l := new(LocalLogger)
	// appName用于记录网络传输时标记的程序发送方，
	// 通过环境变量APPSN进行设置,默认为NONE,此时无法通过网络日志检索区分不同服务发送方
	appSn := os.Getenv("APPSN")
	if appSn == "" {
		appSn = "NONE"
	}
	l.appName = "[" + appSn + "]"
	l.callDepth = dep
	_ = l.SetLogger(AdapterConsole)
	l.timeFormat = logTimeDefaultFormat
	return l
}

//配置文件
type logConfig struct {
	TimeFormat string         `json:"TimeFormat"`
	Console    *consoleLogger `json:"Console,omitempty"`
	File       *fileLogger    `json:"File,omitempty"`
	Conn       *connLogger    `json:"Conn,omitempty"`
}

func init() {
	defaultLogger = NewLogger(3)
}

func (r *LocalLogger) SetLogger(adapterName string, configs ...string) error {
	r.lock.Lock()
	defer r.lock.Unlock()

	if !r.init {
		r.outputs = []*nameLogger{}
		r.init = true
	}

	config := append(configs, "{}")[0]
	var num = -1
	var i int
	var l *nameLogger
	for i, l = range r.outputs {
		if l.name == adapterName {
			if l.config == config {
				//配置没有变动，不重新设置
				return fmt.Errorf("you have set same config for r adaptername %s", adapterName)
			}
			l.Logger.Destroy()
			num = i
			break
		}
	}
	logger, ok := adapters[adapterName]
	if !ok {
		return fmt.Errorf("unknown adaptername %s (forgotten Register?)", adapterName)
	}

	if err := logger.Init(config); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "logger Init <%s> err:%v, %s output ignore!\n",
			adapterName, err, adapterName)
		return err
	}
	if num >= 0 {
		r.outputs[i] = &nameLogger{name: adapterName, Logger: logger, config: config}
		return nil
	}
	r.outputs = append(r.outputs, &nameLogger{name: adapterName, Logger: logger, config: config})
	return nil
}

func (r *LocalLogger) DelLogger(adapterName string) error {
	r.lock.Lock()
	defer r.lock.Unlock()
	outputs := []*nameLogger{}
	for _, lg := range r.outputs {
		if lg.name == adapterName {
			lg.Destroy()
		} else {
			outputs = append(outputs, lg)
		}
	}
	if len(outputs) == len(r.outputs) {
		return fmt.Errorf("logs: unknown adaptername %s (forgotten Register?)", adapterName)
	}
	r.outputs = outputs
	return nil
}

// 设置日志起始路径
func (r *LocalLogger) SetLogPath(bPath bool) {
	r.usePath = bPath
}
func (r *LocalLogger) writeToLoggers(when time.Time, msg *loginfo, level int) {
	for _, l := range r.outputs {
		if l.name == AdapterConn {
			//网络日志，使用json格式发送,此处使用结构体，用于类似ElasticSearch功能检索
			err := l.LogWrite(when, msg, level)
			if err != nil {
				fmt.Fprintf(os.Stderr, "unable to WriteMsg to adapter:%v,error:%v\n", l.name, err)
			}
			continue
		}

		strLevel := " [" + msg.Level + "] "
		strPath := "[" + msg.Path + "] "
		if !r.usePath {
			strPath = ""
		}

		msgStr := when.Format(r.timeFormat) + strLevel + strPath + msg.Content
		err := l.LogWrite(when, msgStr, level)
		if err != nil {
			fmt.Fprintf(os.Stderr, "unable to WriteMsg to adapter:%v,error:%v\n", l.name, err)
		}
	}
}

func (r *LocalLogger) writeMsg(logLevel int, msg string, v ...interface{}) {
	if !r.init {
		_ = r.SetLogger(AdapterConsole)
	}
	msgSt := new(loginfo)
	src := ""
	if len(v) > 0 {
		msg = fmt.Sprintf(msg, v...)
	}
	when := time.Now()
	//
	if r.usePath {
		_, file, lineno, ok := runtime.Caller(r.callDepth)
		var strim = "/"
		if ok {
			codeArr := strings.Split(file, strim)
			code := codeArr[len(codeArr)-1]
			src = strings.Replace(
				fmt.Sprintf("%s:%d", code, lineno), "%2e", ".", -1)
		}
	}
	//
	msgSt.Level = levelPrefix[logLevel]
	msgSt.Path = src
	msgSt.Content = msg
	msgSt.Name = r.appName
	msgSt.Time = when.Format(r.timeFormat)
	r.writeToLoggers(when, msgSt, logLevel)
}

func (r *LocalLogger) Fatal(format string, args ...interface{}) {
	r.Emer("###Exec Panic:"+format, args...)
	os.Exit(1)
}

func (r *LocalLogger) Panic(format string, args ...interface{}) {
	r.Emer("###Exec Panic:"+format, args...)
	panic(fmt.Sprintf(format, args...))
}

// Emer Log EMERGENCY level message.
func (r *LocalLogger) Emer(format string, v ...interface{}) {
	r.writeMsg(LevelEmergency, format, v...)
}

// Alert Log ALERT level message.
func (r *LocalLogger) Alert(format string, v ...interface{}) {
	r.writeMsg(LevelAlert, format, v...)
}

// Crit Log CRITICAL level message.
func (r *LocalLogger) Crit(format string, v ...interface{}) {
	r.writeMsg(LevelCritical, format, v...)
}

// Error Log ERROR level message.
func (r *LocalLogger) Error(format string, v ...interface{}) {
	r.writeMsg(LevelError, format, v...)
}

// Warn Log WARNING level message.
func (r *LocalLogger) Warn(format string, v ...interface{}) {
	r.writeMsg(LevelWarning, format, v...)
}

// Info Log INFO level message.
func (r *LocalLogger) Info(format string, v ...interface{}) {
	r.writeMsg(LevelInformational, format, v...)
}

// Debug Log DEBUG level message.
func (r *LocalLogger) Debug(format string, v ...interface{}) {
	r.writeMsg(LevelDebug, format, v...)
}

// Trace Log TRAC level message.
func (r *LocalLogger) Trace(format string, v ...interface{}) {
	r.writeMsg(LevelTrace, format, v...)
}

func (r *LocalLogger) Close() {
	for _, l := range r.outputs {
		l.Destroy()
	}
	r.outputs = nil
}

func (r *LocalLogger) Reset() {
	for _, l := range r.outputs {
		l.Destroy()
	}
	r.outputs = nil
}

func (r *LocalLogger) SetCallDepth(depth int) {
	r.callDepth = depth
}

// GetlocalLogger returns the defaultLogger
func GetlocalLogger() *LocalLogger {
	return defaultLogger
}

// Reset will remove all the adapter
func Reset() {
	defaultLogger.Reset()
}

func SetLogPath(show bool) {
	defaultLogger.SetLogPath(show)
}

// param 可以是log配置文件名，也可以是log配置内容,默认DEBUG输出到控制台
func SetLogger(param ...string) error {
	if len(param) == 0 {
		//默认只输出到控制台
		_ = defaultLogger.SetLogger(AdapterConsole)
		return nil
	}

	c := param[0]
	conf := new(logConfig)
	err := json.Unmarshal([]byte(c), conf)
	if err != nil { //不是json，就认为是配置文件，如果都不是，打印日志，然后退出
		// Open the configuration file
		fd, err := os.Open(c)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Could not open %s for configure: %s\n", c, err)
			os.Exit(1)
			return err
		}

		contents, err := ioutil.ReadAll(fd)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Could not read %s: %s\n", c, err)
			os.Exit(1)
			return err
		}
		err = json.Unmarshal(contents, conf)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Could not Unmarshal %s: %s\n", contents, err)
			os.Exit(1)
			return err
		}
	}
	if conf.TimeFormat != "" {
		defaultLogger.timeFormat = conf.TimeFormat
	}
	if conf.Console != nil {
		console, _ := json.Marshal(conf.Console)
		_ = defaultLogger.SetLogger(AdapterConsole, string(console))
	}
	if conf.File != nil {
		file, _ := json.Marshal(conf.File)
		_ = defaultLogger.SetLogger(AdapterFile, string(file))
	}
	if conf.Conn != nil {
		conn, _ := json.Marshal(conf.Conn)
		_ = defaultLogger.SetLogger(AdapterConn, string(conn))
	}
	return nil
}

// Painc logs a message at emergency level and panic.
func Painc(f interface{}, v ...interface{}) {
	defaultLogger.Panic(formatLog(f, v...))
}

// Fatal logs a message at emergency level and exit.
func Fatal(f interface{}, v ...interface{}) {
	defaultLogger.Fatal(formatLog(f, v...))
}

// Emer logs a message at emergency level.
func Emer(f interface{}, v ...interface{}) {
	defaultLogger.Emer(formatLog(f, v...))
}

// Alert logs a message at alert level.
func Alert(f interface{}, v ...interface{}) {
	defaultLogger.Alert(formatLog(f, v...))
}

// Crit logs a message at critical level.
func Crit(f interface{}, v ...interface{}) {
	defaultLogger.Crit(formatLog(f, v...))
}

// Error logs a message at error level.
func Error(f interface{}, v ...interface{}) {
	defaultLogger.Error(formatLog(f, v...))
}

// Warn logs a message at warning level.
func Warn(f interface{}, v ...interface{}) {
	defaultLogger.Warn(formatLog(f, v...))
}

// Info logs a message at info level.
func Info(f interface{}, v ...interface{}) {
	defaultLogger.Info(formatLog(f, v...))
}

// Notice logs a message at debug level.
func Debug(f interface{}, v ...interface{}) {
	defaultLogger.Debug(formatLog(f, v...))
}

// Trace logs a message at trace level.
func Trace(f interface{}, v ...interface{}) {
	defaultLogger.Trace(formatLog(f, v...))
}

func formatLog(f interface{}, v ...interface{}) string {
	var out string
	switch msg := f.(type) {
	case string:
		if len(v) == 0 {
			return msg
		}
		if strings.Contains(msg, "%") && !strings.Contains(msg, "%%") {
			//format string
		} else {
			//do not contain format char
			msg += strings.Repeat(" %v", len(v))
		}
		out = msg
	default:
		out = fmt.Sprint(f)
		if len(v) == 0 {
			return out
		}
		out += strings.Repeat(" %v", len(v))
	}
	return fmt.Sprintf(out, v...)
}
