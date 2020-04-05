# logger
convenient log package

# 1. 使用说明
```go
    import  "github.com/wonderivan/logger"

    // 配置logger，如果不配置时默认为控制台输出，等级为DEBG
    logger.SetLogger(`{"Console": {"level": "DEBG"}`)
    // 配置说明见下文

    // 设置完成后，即可在控制台和日志文件app.log中看到如下输出
    logger.Trace("this is Trace")
    logger.Debug("this is Debug")
    logger.Info("this is Info")
    logger.Warn("this is Warn")
    logger.Error("this is Error")
    logger.Crit("this is Critical")
    logger.Alert("this is Alert")
    logger.Emer("this is Emergency")
```
输出结果：

![](images/output1.png)

# 2. 日志等级

当前日志输出等级共8种，从0-7对应的等级由高到底，当配置为某个输出等级时，只有大于等于该等级的日志才会输出。不同的输出适配器支持不同的日志等级配置：

| 等级 | 配置 | 释义                                             | 控制台颜色 |
| ---- | ---- | ------------------------------------------------ | ---------- |
| 0    | EMER | 系统级紧急，比如磁盘出错，内存异常，网络不可用等 | 红色底     |
| 1    | ALRT | 系统级警告，比如数据库访问异常，配置文件出错等   | 紫色       |
| 2    | CRIT | 系统级危险，比如权限出错，访问异常等             | 蓝色       |
| 3    | EROR | 用户级错误                                       | 红色       |
| 4    | WARN | 用户级警告                                       | 黄色       |
| 5    | INFO | 用户级重要                                       | 天蓝色     |
| 6    | DEBG | 用户级调试                                       | 绿色       |
| 7    | TRAC | 用户级基本输出                                   | 绿色       |


# 3. 配置说明
logger当前支持控制台、文件、网络3种方式适配器输出，可以通过各自的参数进行设置，该logger支持多个方式同时输出，如果未配置某项适配器时，则不初始化也不会输出到该适配器。

通过调用logger.SetLogger(config string)方法设置参数，config支持json配置，也支持指定内容为json配置的文件路径，例如：
```go
    // 通过配置参数直接配置
    logger.SetLogger(`{"Console": {"level": "DEBG"}}`)
    // 通过配置文件配置
    logger.SetLogger("/home/log.json")

```

```json
{
    "TimeFormat":"2006-01-02 15:04:05", // 输出日志开头时间格式
    "Console": {            // 控制台日志配置
        "level": "TRAC",    // 控制台日志输出等级
        "color": true       // 控制台日志颜色开关 
    },
    "File": {                   // 文件日志配置
        "filename": "app.log",  // 初始日志文件名
        "level": "TRAC",        // 日志文件日志输出等级
        "daily": true,          // 跨天后是否创建新日志文件，当append=true时有效
        "maxlines": 1000000,    // 日志文件最大行数，当append=true时有效
        "maxsize": 1,           // 日志文件最大大小，当append=true时有效
        "maxdays": -1,          // 日志文件有效期
        "append": true,         // 是否支持日志追加
        "permit": "0660"        // 新创建的日志文件权限属性
    },
    "Conn": {                       // 网络日志配置
        "net":"tcp",                // 日志传输模式
        "addr":"10.1.55.10:1024",   // 日志接收服务器
        "level": "Warn",            // 网络日志输出等级
        "reconnect":true,           // 网络断开后是否重连
        "reconnectOnMsg":false,     // 发送完每条消息后是否断开网络
    }
}
```

- 时间格式

| 时间类型     | 时间格式                                  |
| ------------ | ----------------------------------------- |
| ANSIC        | "Mon Jan _2 15:04:05 2006"                |
| UnixDate     | "Mon Jan _2 15:04:05 MST 2006"            |
| RubyDate     | "Mon Jan 02 15:04:05 -0700 2006"          |
| RFC822       | "02 Jan 06 15:04 MST"                     |
| RFC822Z      | "02 Jan 06 15:04 -0700"                   |
| RFC850       | "Monday, 02-Jan-06 15:04:05 MST"          |
| RFC1123      | "Mon, 02 Jan 2006 15:04:05 MST"           |
| RFC1123Z     | "Mon, 02 Jan 2006 15:04:05 -0700"         |
| RFC3339      | "2006-01-02T15:04:05Z07:00"               |
| RFC3339Nano  | "2006-01-02T15:04:05.999999999Z07:00"     |
| Kitchen      | "3:04PM"                                  |
| Stamp        | "Jan _2 15:04:05"                         |
| StampMilli   | "Jan _2 15:04:05.000"                     |
| StampMicro   | "Jan _2 15:04:05.000000"                  |
| StampNano    | "Jan _2 15:04:05.000000000"               |
| RFC3339Nano1 | "2006-01-02 15:04:05.999999999 -0700 MST" |
| DEFAULT      | "2006-01-02 15:04:05"                     |

- 时间格式打印：
```
========RFC1123Z time format========
Thu, 02 Aug 2018 18:48:04 +0800 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug RFC1123Z
========Stamp time format========
Aug  2 18:48:04 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug Stamp
========StampMilli time format========
Aug  2 18:48:04.489 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug StampMilli
========StampNano time format========
Aug  2 18:48:04.490002155 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug StampNano
========RubyDate time format========
Thu Aug 02 18:48:04 +0800 2018 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug RubyDate
========RFC822 time format========
02 Aug 18 18:48 CST [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug RFC822
========RFC822Z time format========
02 Aug 18 18:48 +0800 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug RFC822Z
========RFC1123 time format========
Thu, 02 Aug 2018 18:48:04 CST [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug RFC1123
========RFC3339 time format========
2018-08-02T18:48:04+08:00 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug RFC3339
========RFC3339Nano time format========
2018-08-02T18:48:04.490377325+08:00 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug RFC3339Nano
========ANSIC time format========
Thu Aug  2 18:48:04 2018 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug ANSIC
========UnixDate time format========
Thu Aug  2 18:48:04 CST 2018 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug UnixDate
========RFC850 time format========
Thursday, 02-Aug-18 18:48:04 CST [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug RFC850
========Kitchen time format========
6:48PM [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug Kitchen
========StampMicro time format========
Aug  2 18:48:04.490662 [DEBG] [github.com/wonderivan/logger/log_test.go:115] Debug StampMicro
```

# 4. 其他

1. logger默认是控制台输出，输出等级为DEBG，默认是支持颜色区分的。
2. 日志文件append为true时，当写入的日志文件发生跨天(daily为true)或超过最大限制时，会创建一个新文件，原有文件格式被重命名为： ****.xxxx-xx-xx.xxx.xxx 格式，例如：当向app.log写入日志时，触发了创建新文件操作，则将app.log重命名为 app.2018-01-01.001.log, 如果此时app.2018-01-01.001.log已经存在，则将刚才的app.log重命名为 app.2018-01-01.002.log，以此类推。
3. logger package默认初始化了全局的defaultLogger，直接调用logger包的Debug方法时，会默认调用defaultLogger.Debug，所以普通调用时，仅需要import logger即可使用。
4. 网络配置中的reconnectOnMsg为每条消息都重连一次网络日志中心，适用于写日志频率极低的情况下的服务调用,避免长时间连接，占用资源。但强烈不建议普通使用时设置为true，这将会导致调用方反复的网络重连，极大增加资源消耗和延迟。
5. conn网络输出适配器经过ELK集成环境的测试验证，通过该方式发送的日志，能够正常通过Elecsearch和Kibana检索和分析