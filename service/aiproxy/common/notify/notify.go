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
	Notify(level Level, message string)
	NotifyThrottle(level Level, key string, expiration time.Duration, message string)
}

var defaultNotifier Notifier = &MockNotifier{}

func SetDefaultNotifier(notifier Notifier) {
	defaultNotifier = notifier
}

func Notify(level Level, message string) {
	defaultNotifier.Notify(level, message)
}

func Info(message string) {
	defaultNotifier.Notify(LevelInfo, message)
}

func Warn(message string) {
	defaultNotifier.Notify(LevelWarn, message)
}

func Error(message string) {
	defaultNotifier.Notify(LevelError, message)
}

func limitKey(level Level, key string) string {
	return fmt.Sprintf("notifylimit:%s:%s", level, key)
}

func NotifyThrottle(level Level, key string, expiration time.Duration, message string) {
	defaultNotifier.NotifyThrottle(level, limitKey(level, key), expiration, message)
}

func InfoThrottle(key string, expiration time.Duration, message string) {
	defaultNotifier.NotifyThrottle(LevelInfo, limitKey(LevelInfo, key), expiration, message)
}

func WarnThrottle(key string, expiration time.Duration, message string) {
	defaultNotifier.NotifyThrottle(LevelWarn, limitKey(LevelWarn, key), expiration, message)
}

func ErrorThrottle(key string, expiration time.Duration, message string) {
	defaultNotifier.NotifyThrottle(LevelError, limitKey(LevelError, key), expiration, message)
}
