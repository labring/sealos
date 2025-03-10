package notify

import (
	"fmt"
	"time"
)

type Level string

const (
	LevelInfo  Level = "info"
	LevelWarn  Level = "warn"
	LevelError Level = "error"
)

type Notifier interface {
	Notify(level Level, title, message string)
	NotifyThrottle(level Level, key string, expiration time.Duration, title, message string)
}

var (
	stdNotifier     Notifier = &StdNotifier{}
	defaultNotifier Notifier = stdNotifier
)

func SetDefaultNotifier(notifier Notifier) {
	defaultNotifier = notifier
}

func Notify(level Level, title, message string) {
	defaultNotifier.Notify(level, title, message)
}

func Info(title, message string) {
	defaultNotifier.Notify(LevelInfo, title, message)
}

func Warn(title, message string) {
	defaultNotifier.Notify(LevelWarn, title, message)
}

func Error(title, message string) {
	defaultNotifier.Notify(LevelError, title, message)
}

func limitKey(level Level, key string) string {
	return fmt.Sprintf("notifylimit:%s:%s", level, key)
}

func NotifyThrottle(level Level, key string, expiration time.Duration, title, message string) {
	defaultNotifier.NotifyThrottle(level, limitKey(level, key), expiration, title, message)
}

func InfoThrottle(key string, expiration time.Duration, title, message string) {
	defaultNotifier.NotifyThrottle(LevelInfo, limitKey(LevelInfo, key), expiration, title, message)
}

func WarnThrottle(key string, expiration time.Duration, title, message string) {
	defaultNotifier.NotifyThrottle(LevelWarn, limitKey(LevelWarn, key), expiration, title, message)
}

func ErrorThrottle(key string, expiration time.Duration, title, message string) {
	defaultNotifier.NotifyThrottle(LevelError, limitKey(LevelError, key), expiration, title, message)
}
