// Copyright © 2021 github.com/wonderivan/logger
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
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// 默认日志输出
var defaultLogger *LocalLogger
var debugMode bool

// 日志等级，从0-7，日优先级由高到低
const (
	LevelEmergency     logLevel = iota // 系统级紧急，比如磁盘出错，内存异常，网络不可用等
	LevelAlert                         // 系统级警告，比如数据库访问异常，配置文件出错等
	LevelCritical                      // 系统级危险，比如权限出错，访问异常等
	LevelError                         // 用户级错误
	LevelWarning                       // 用户级警告
	LevelInformational                 // 用户级信息
	LevelDebug                         // 用户级调试
	LevelTrace                         // 用户级基本输出
)

// LevelMap 日志等级和描述映射关系
var LevelMap = map[string]logLevel{
	"EMER": LevelEmergency,
	"ALRT": LevelAlert,
	"CRIT": LevelCritical,
	"EROR": LevelError,
	"WARN": LevelWarning,
	"INFO": LevelInformational,
	"DEBG": LevelDebug,
	"TRAC": LevelTrace,
}

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

type logLevel int

// log provider interface
type Logger interface {
	Init(config string) error
	LogWrite(when time.Time, msg interface{}, level logLevel) error
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
	l.usePath = true
	//l.SetLogger(AdapterConsole)
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

func Cfg(debugMod bool, logDir string) {
	debugMode = debugMod
	logLev := 5
	if debugMod {
		logLev = 6
		SetLogPath(true)
	}
	SetLogger(fmt.Sprintf(`{
					"TimeFormat": "2006-01-02 15:04:05",
					"Console": {
						"level": "",
						"color": true,
						"LogLevel": %d
					},
					"File": {
						"filename": "%s/%s.log",
						"level": "TRAC",
						"daily": true,
						"maxlines": 1000000,
						"maxsize": 1,
						"maxdays": -1,
						"append": true,
						"permit": "0660",
						"LogLevel":0
				}}`,
		logLev, logDir, time.Now().Format("2006-01-02"),
	))

	SetLogPath(true)
}

func (localLog *LocalLogger) SetLogger(adapterName string, configs ...string) {
	localLog.lock.Lock()
	defer localLog.lock.Unlock()

	if !localLog.init {
		localLog.outputs = []*nameLogger{}
		localLog.init = true
	}

	config := append(configs, "{}")[0]
	var num = -1
	var i int
	var l *nameLogger
	for i, l = range localLog.outputs {
		if l.name == adapterName {
			if l.config == config {
				//配置没有变动，不重新设置
				fmt.Printf("you have set same config for locallog adaptername %s", adapterName)
			}
			l.Logger.Destroy()
			num = i
			break
		}
	}
	logger, ok := adapters[adapterName]
	if !ok {
		fmt.Printf("unknown adaptername %s (forgotten Register?)", adapterName)
	}

	if err := logger.Init(config); err != nil {
		fmt.Fprintf(os.Stderr, "logger Init <%s> err:%v, %s output ignore!\n",
			adapterName, err, adapterName)
	}
	if num >= 0 {
		localLog.outputs[i] = &nameLogger{name: adapterName, Logger: logger, config: config}
	}
	localLog.outputs = append(localLog.outputs, &nameLogger{name: adapterName, Logger: logger, config: config})
}

func (localLog *LocalLogger) DelLogger(adapterName string) error {
	localLog.lock.Lock()
	defer localLog.lock.Unlock()
	var outputs []*nameLogger
	for _, lg := range localLog.outputs {
		if lg.name == adapterName {
			lg.Destroy()
		} else {
			outputs = append(outputs, lg)
		}
	}
	if len(outputs) == len(localLog.outputs) {
		return fmt.Errorf("logs: unknown adaptername %s (forgotten Register?)", adapterName)
	}
	localLog.outputs = outputs
	return nil
}

// 设置日志起始路径
func (localLog *LocalLogger) SetLogPath(bPath bool) {
	localLog.usePath = bPath
}

func (localLog *LocalLogger) writeToLoggers(when time.Time, msg *loginfo, level logLevel) {
	for _, l := range localLog.outputs {
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
		if !localLog.usePath {
			strPath = ""
		}

		msgStr := when.Format(localLog.timeFormat) + strLevel + strPath + msg.Content
		err := l.LogWrite(when, msgStr, level)
		if err != nil {
			fmt.Fprintf(os.Stderr, "unable to WriteMsg to adapter:%v,error:%v\n", l.name, err)
		}
	}
}

func (localLog *LocalLogger) writeMsg(level logLevel, msg string, v ...interface{}) {
	if !localLog.init {
		localLog.SetLogger(AdapterConsole)
	}
	msgSt := new(loginfo)
	src := ""
	if len(v) > 0 {
		msg = fmt.Sprintf(msg, v...)
	}
	when := time.Now()
	//
	if localLog.usePath {
		_, file, lineno, ok := runtime.Caller(localLog.callDepth)
		var strim = "/"
		if ok {
			codeArr := strings.Split(file, strim)
			code := codeArr[len(codeArr)-1]
			src = strings.Replace(
				fmt.Sprintf("%s:%d", code, lineno), "%2e", ".", -1)
		}
	}
	//
	msgSt.Level = levelPrefix[level]
	msgSt.Path = src
	msgSt.Content = msg
	msgSt.Name = localLog.appName
	msgSt.Time = when.Format(localLog.timeFormat)
	localLog.writeToLoggers(when, msgSt, level)
}

func (localLog *LocalLogger) Fatal(format string, args ...interface{}) {
	localLog.Emer("###Exec Panic:"+format, args...)
	os.Exit(1)
}

func (localLog *LocalLogger) Panic(format string, args ...interface{}) {
	localLog.Emer("###Exec Panic:"+format, args...)
	panic(fmt.Sprintf(format, args...))
}

// Emer Log EMERGENCY level message.
func (localLog *LocalLogger) Emer(format string, v ...interface{}) {
	localLog.writeMsg(LevelEmergency, format, v...)
}

// Alert Log ALERT level message.
func (localLog *LocalLogger) Alert(format string, v ...interface{}) {
	localLog.writeMsg(LevelAlert, format, v...)
}

// Crit Log CRITICAL level message.
func (localLog *LocalLogger) Crit(format string, v ...interface{}) {
	localLog.writeMsg(LevelCritical, format, v...)
}

// Error Log ERROR level message.
func (localLog *LocalLogger) Error(format string, v ...interface{}) {
	localLog.writeMsg(LevelError, format, v...)
}

// Warn Log WARNING level message.
func (localLog *LocalLogger) Warn(format string, v ...interface{}) {
	localLog.writeMsg(LevelWarning, format, v...)
}

// Info Log INFO level message.
func (localLog *LocalLogger) Info(format string, v ...interface{}) {
	localLog.writeMsg(LevelInformational, format, v...)
}

// Debug Log DEBUG level message.
func (localLog *LocalLogger) Debug(format string, v ...interface{}) {
	if debugMode {
		localLog.writeMsg(LevelDebug, format, v...)
	}
}

// Trace Log TRAC level message.
func (localLog *LocalLogger) Trace(format string, v ...interface{}) {
	localLog.writeMsg(LevelTrace, format, v...)
}

func (localLog *LocalLogger) Close() {
	for _, l := range localLog.outputs {
		l.Destroy()
	}
	localLog.outputs = nil
}

func (localLog *LocalLogger) Reset() {
	for _, l := range localLog.outputs {
		l.Destroy()
	}
	localLog.outputs = nil
}

func (localLog *LocalLogger) SetCallDepth(depth int) {
	localLog.callDepth = depth
}

// GetlocalLogger returns the defaultLogger
func GetlocalLogger() *LocalLogger {
	return defaultLogger
}

// Reset will remove all the adapter
func Reset() {
	defaultLogger.Reset()
}

func IsDebugModel() bool {
	return debugMode
}

func SetLogPath(show bool) {
	defaultLogger.SetLogPath(show)
}

// param 可以是log配置文件名，也可以是log配置内容,默认DEBUG输出到控制台
func SetLogger(param ...string) {
	if len(param) == 0 {
		//默认只输出到控制台
		defaultLogger.SetLogger(AdapterConsole)
	}

	c := param[0]
	conf := new(logConfig)
	err := json.Unmarshal([]byte(c), conf)
	if err != nil { //不是json，就认为是配置文件，如果都不是，打印日志，然后退出
		// Open the configuration file
		fd, err := os.Open(filepath.Clean(c))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Could not open %s for configure: %s\n", c, err)
			os.Exit(1)
		}

		contents, err := ioutil.ReadAll(fd)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Could not read %s: %s\n", c, err)
			os.Exit(1)
		}
		err = json.Unmarshal(contents, conf)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Could not Unmarshal %s: %s\n", contents, err)
			os.Exit(1)
		}
	}
	if conf.TimeFormat != "" {
		defaultLogger.timeFormat = conf.TimeFormat
	}
	if conf.Console != nil {
		console, _ := json.Marshal(conf.Console)
		defaultLogger.SetLogger(AdapterConsole, string(console))
	}
	if conf.File != nil {
		file, _ := json.Marshal(conf.File)
		defaultLogger.SetLogger(AdapterFile, string(file))
	}
	if conf.Conn != nil {
		conn, _ := json.Marshal(conf.Conn)
		defaultLogger.SetLogger(AdapterConn, string(conn))
	}
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

// Debug logs a message at debug level.
func Debug(f interface{}, v ...interface{}) {
	defaultLogger.Debug(formatLog(f, v...))
}

// Trace logs a message at trace level.
func Trace(f interface{}, v ...interface{}) {
	defaultLogger.Trace(formatLog(f, v...))
}

func formatLog(f interface{}, v ...interface{}) string {
	var msg string
	switch f := f.(type) {
	case string:
		msg = f
		if len(v) == 0 {
			return msg
		}
		if strings.Contains(msg, "%") && !strings.Contains(msg, "%%") {
			//format string
		} else {
			//do not contain format char
			msg += strings.Repeat(" %v", len(v))
		}
	default:
		msg = fmt.Sprint(f)
		if len(v) == 0 {
			return msg
		}
		msg += strings.Repeat(" %v", len(v))
	}
	return fmt.Sprintf(msg, v...)
}

/*func stringTrim(s string, cut string) string {
	ss := strings.SplitN(s, cut, 2)
	if len(ss) == 1 {
		return ss[0]
	}
	return ss[1]
}*/
