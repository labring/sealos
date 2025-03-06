package notify

import (
	log "github.com/sirupsen/logrus"
)

type MockNotifier struct{}

var (
	infoLogrus  = log.WithField("notify", "mock")
	warnLogrus  = log.WithField("notify", "mock")
	errorLogrus = log.WithField("notify", "mock")
)

func (n *MockNotifier) Notify(level Level, message string) {
	switch level {
	case LevelInfo:
		infoLogrus.Info(message)
	case LevelWarn:
		warnLogrus.Warn(message)
	case LevelError:
		errorLogrus.Error(message)
	}
}
