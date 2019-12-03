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

// 日志等级和描述映射关系
var LevelMap = map[string]int{
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
	usePath    string
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
	l.SetLogger(AdapterConsole)
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

func (this *LocalLogger) SetLogger(adapterName string, configs ...string) error {
	this.lock.Lock()
	defer this.lock.Unlock()

	if !this.init {
		this.outputs = []*nameLogger{}
		this.init = true
	}

	config := append(configs, "{}")[0]
	var num int = -1
	var i int
	var l *nameLogger
	for i, l = range this.outputs {
		if l.name == adapterName {
			if l.config == config {
				//配置没有变动，不重新设置
				return fmt.Errorf("you have set same config for this adaptername %s", adapterName)
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

	err := logger.Init(config)
	if err != nil {
		fmt.Fprintf(os.Stderr, "logger Init <%s> err:%v, %s output ignore!\n",
			adapterName, err, adapterName)
		return err
	}
	if num >= 0 {
		this.outputs[i] = &nameLogger{name: adapterName, Logger: logger, config: config}
		return nil
	}
	this.outputs = append(this.outputs, &nameLogger{name: adapterName, Logger: logger, config: config})
	return nil
}

func (this *LocalLogger) DelLogger(adapterName string) error {
	this.lock.Lock()
	defer this.lock.Unlock()
	outputs := []*nameLogger{}
	for _, lg := range this.outputs {
		if lg.name == adapterName {
			lg.Destroy()
		} else {
			outputs = append(outputs, lg)
		}
	}
	if len(outputs) == len(this.outputs) {
		return fmt.Errorf("logs: unknown adaptername %s (forgotten Register?)", adapterName)
	}
	this.outputs = outputs
	return nil
}

// 设置日志起始路径
func (this *LocalLogger) SetLogPathTrim(trimPath string) {
	this.usePath = trimPath
}

func (this *LocalLogger) writeToLoggers(when time.Time, msg *loginfo, level int) {
	for _, l := range this.outputs {
		if l.name == AdapterConn {
			//网络日志，使用json格式发送,此处使用结构体，用于类似ElasticSearch功能检索
			err := l.LogWrite(when, msg, level)
			if err != nil {
				fmt.Fprintf(os.Stderr, "unable to WriteMsg to adapter:%v,error:%v\n", l.name, err)
			}
			continue
		}

		msgStr := when.Format(this.timeFormat) + " [" + msg.Level + "] " + "[" + msg.Path + "] " + msg.Content
		err := l.LogWrite(when, msgStr, level)
		if err != nil {
			fmt.Fprintf(os.Stderr, "unable to WriteMsg to adapter:%v,error:%v\n", l.name, err)
		}
	}
}

func (this *LocalLogger) writeMsg(logLevel int, msg string, v ...interface{}) error {
	if !this.init {
		this.SetLogger(AdapterConsole)
	}
	msgSt := new(loginfo)
	src := ""
	if len(v) > 0 {
		msg = fmt.Sprintf(msg, v...)
	}
	when := time.Now()
	_, file, lineno, ok := runtime.Caller(this.callDepth)
	var strim string = "src/"
	if this.usePath != "" {
		strim = this.usePath
	}
	if ok {

		src = strings.Replace(
			fmt.Sprintf("%s:%d", stringTrim(file, strim), lineno), "%2e", ".", -1)
	}

	msgSt.Level = levelPrefix[logLevel]
	msgSt.Path = src
	msgSt.Content = msg
	msgSt.Name = this.appName
	msgSt.Time = when.Format(this.timeFormat)
	this.writeToLoggers(when, msgSt, logLevel)

	return nil
}

func (this *LocalLogger) Fatal(format string, args ...interface{}) {
	this.Emer("###Exec Panic:"+format, args...)
	os.Exit(1)
}

func (this *LocalLogger) Panic(format string, args ...interface{}) {
	this.Emer("###Exec Panic:"+format, args...)
	panic(fmt.Sprintf(format, args...))
}

// Emer Log EMERGENCY level message.
func (this *LocalLogger) Emer(format string, v ...interface{}) {
	this.writeMsg(LevelEmergency, format, v...)
}

// Alert Log ALERT level message.
func (this *LocalLogger) Alert(format string, v ...interface{}) {
	this.writeMsg(LevelAlert, format, v...)
}

// Crit Log CRITICAL level message.
func (this *LocalLogger) Crit(format string, v ...interface{}) {
	this.writeMsg(LevelCritical, format, v...)
}

// Error Log ERROR level message.
func (this *LocalLogger) Error(format string, v ...interface{}) {
	this.writeMsg(LevelError, format, v...)
}

// Warn Log WARNING level message.
func (this *LocalLogger) Warn(format string, v ...interface{}) {
	this.writeMsg(LevelWarning, format, v...)
}

// Info Log INFO level message.
func (this *LocalLogger) Info(format string, v ...interface{}) {
	this.writeMsg(LevelInformational, format, v...)
}

// Debug Log DEBUG level message.
func (this *LocalLogger) Debug(format string, v ...interface{}) {
	this.writeMsg(LevelDebug, format, v...)
}

// Trace Log TRAC level message.
func (this *LocalLogger) Trace(format string, v ...interface{}) {
	this.writeMsg(LevelTrace, format, v...)
}

func (this *LocalLogger) Close() {

	for _, l := range this.outputs {
		l.Destroy()
	}
	this.outputs = nil

}

func (this *LocalLogger) Reset() {
	for _, l := range this.outputs {
		l.Destroy()
	}
	this.outputs = nil
}

func (this *LocalLogger) SetCallDepth(depth int) {
	this.callDepth = depth
}

// GetlocalLogger returns the defaultLogger
func GetlocalLogger() *LocalLogger {
	return defaultLogger
}

// Reset will remove all the adapter
func Reset() {
	defaultLogger.Reset()
}

func SetLogPathTrim(trimPath string) {
	defaultLogger.SetLogPathTrim(trimPath)
}

// param 可以是log配置文件名，也可以是log配置内容,默认DEBUG输出到控制台
func SetLogger(param ...string) error {
	if 0 == len(param) {
		//默认只输出到控制台
		defaultLogger.SetLogger(AdapterConsole)
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
	var msg string
	switch f.(type) {
	case string:
		msg = f.(string)
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

func stringTrim(s string, cut string) string {
	ss := strings.SplitN(s, cut, 2)
	if 1 == len(ss) {
		return ss[0]
	}
	return ss[1]
}
