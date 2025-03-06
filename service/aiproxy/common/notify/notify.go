package notify

import (
	"fmt"
	"time"

	"github.com/labring/sealos/service/aiproxy/common/trylock"
)

type Level string

const (
	LevelInfo  Level = "info"
	LevelWarn  Level = "warn"
	LevelError Level = "error"
)

type Notifier interface {
	Notify(level Level, message string)
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

func notifyLimit(level Level, key string, expiration time.Duration) bool {
	return trylock.Lock(limitKey(level, key), expiration)
}

func NotifyLimit(level Level, key string, expiration time.Duration, message string) {
	if !notifyLimit(level, key, expiration) {
		return
	}
	defaultNotifier.Notify(level, message)
}

func InfoLimit(key string, expiration time.Duration, message string) {
	if !notifyLimit(LevelInfo, key, expiration) {
		return
	}
	defaultNotifier.Notify(LevelInfo, message)
}

func WarnLimit(key string, expiration time.Duration, message string) {
	if !notifyLimit(LevelWarn, key, expiration) {
		return
	}
	defaultNotifier.Notify(LevelWarn, message)
}

func ErrorLimit(key string, expiration time.Duration, message string) {
	if !notifyLimit(LevelError, key, expiration) {
		return
	}
	defaultNotifier.Notify(LevelError, message)
}
