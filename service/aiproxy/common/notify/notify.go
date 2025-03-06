package notify

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
