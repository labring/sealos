package logger

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/sirupsen/logrus"
)

/*
func main() {
	// Example usage:
	// Replace with your Feishu Webhook URL, e.g., "https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"
	webhookURL := "" // Set your webhook here
	// Set minimum level for Feishu alerts (e.g., WARN means WARN, ERROR, FATAL will send alerts)
	// Set component name for the system component
	logger := NewLogger(nil, webhookURL, WARN, "PaymentService")

	logger.Debugln("This is a debug message (stdout only with default WARN level).")
	logger.Infoln("This is an info message (stdout only with default WARN level).")
	logger.Warnln("This is a warning (orange card in Feishu).")
	logger.Errorln("This is an error (red card in Feishu).")
	logger.Errorf("Error with format: %s and %d", "foo", 123)
	// logger.Fatalln("This is a fatal error (red card in Feishu, then exit).")
}
*/

// Level defines the log levels.
type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
	FATAL
)

// String converts Level to string representation.
func (l Level) String() string {
	switch l {
	case DEBUG:
		return "DEBUG"
	case INFO:
		return "INFO"
	case WARN:
		return "WARN"
	case ERROR:
		return "ERROR"
	case FATAL:
		return "FATAL"
	default:
		return "UNKNOWN"
	}
}

// LarkCardMessage represents the structure for a Feishu Interactive Card message.
type LarkCardMessage struct {
	MsgType string `json:"msg_type"`
	Card    struct {
		Header struct {
			Template string `json:"template"`
			Title    struct {
				Content string `json:"content"`
				Tag     string `json:"tag"`
			} `json:"title"`
		} `json:"header"`
		Elements []struct {
			Tag     string `json:"tag"`
			Content string `json:"content"`
		} `json:"elements"`
	} `json:"card"`
}

// Logger is a custom logger that outputs to stdout and sends styled alerts to Feishu based on level.
type Logger struct {
	stdLogger *logrus.Logger
	webhook   string
	minLevel  Level
	component string // System component name
}

// NewLogger creates a new Logger instance.
// - stdOutput: the output for standard logs (default os.Stdout if nil)
// - webhook: the Feishu Webhook URL for alerts (empty string to disable)
// - minLevel: the minimum log level for sending Feishu alerts
// - component: the system component name to include in Feishu alerts
func NewFeishuLogger(stdOutput *os.File, webhook string, minLevel Level, component string) *Logger {
	if stdOutput == nil {
		stdOutput = os.Stdout
	}
	if component == "" {
		component = "Unknown"
	}
	logger := &Logger{
		stdLogger: logrus.New(),
		webhook:   webhook,
		minLevel:  minLevel,
		component: component,
	}
	logger.Infof("starting Feishu logger for component: %s with minLevel: %s", component, minLevel.String())
	return logger
}

// sendAlert sends a styled card message to Feishu Webhook based on log level.
func (l *Logger) sendAlert(level Level, message string) error {
	if l.webhook == "" || level < l.minLevel {
		return nil // No webhook configured or level below threshold
	}

	// Determine card style based on log level
	var templateColor string
	switch level {
	case DEBUG:
		templateColor = "blue"
	case INFO:
		templateColor = "green"
	case WARN:
		templateColor = "orange"
	case ERROR, FATAL:
		templateColor = "red"
	default:
		templateColor = "blue"
	}

	// Construct Feishu Interactive Card
	msg := LarkCardMessage{
		MsgType: "interactive",
	}
	msg.Card.Header.Template = templateColor
	msg.Card.Header.Title.Content = fmt.Sprintf("[%s] %s Alert", l.component, level.String())
	msg.Card.Header.Title.Tag = "plain_text"
	msg.Card.Elements = []struct {
		Tag     string `json:"tag"`
		Content string `json:"content"`
	}{
		{
			Tag:     "markdown",
			Content: fmt.Sprintf("**Message**: %s\n**Time**: %s", message, time.Now().Format(time.RFC3339)),
		},
	}

	jsonData, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	resp, err := http.Post(l.webhook, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("feishu webhook returned status: %d", resp.StatusCode)
	}

	return nil
}

// Debugf logs a debug-level message to stdout.
func (l *Logger) Debugf(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	l.stdLogger.Printf("[DEBUG] %s", msg)
	if err := l.sendAlert(DEBUG, msg); err != nil {
		l.stdLogger.Printf("[ERROR] Failed to send Feishu alert: %v", err)
	}
}

// Printf logs an info-level message to stdout (alias for Infof).
func (l *Logger) Printf(format string, v ...interface{}) {
	l.Infof(format, v...)
}

// Infof logs an info-level message to stdout.
func (l *Logger) Infof(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	l.stdLogger.Printf("[INFO] %s", msg)
	if err := l.sendAlert(INFO, msg); err != nil {
		l.stdLogger.Printf("[ERROR] Failed to send Feishu alert: %v", err)
	}
}

// Warnf logs a warn-level message to stdout and sends a Feishu alert if level >= minLevel.
func (l *Logger) Warnf(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	l.stdLogger.Printf("[WARN] %s", msg)
	if err := l.sendAlert(WARN, msg); err != nil {
		l.stdLogger.Printf("[ERROR] Failed to send Feishu alert: %v", err)
	}
}

// Errorf logs an error-level message to stdout and sends a Feishu alert if level >= minLevel.
func (l *Logger) Errorf(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	l.stdLogger.Printf("[ERROR] %s", msg)
	if err := l.sendAlert(ERROR, msg); err != nil {
		l.stdLogger.Printf("[ERROR] Failed to send Feishu alert: %v", err)
	}
}

// Fatalf logs a fatal error to stdout, sends an alert if level >= minLevel, and exits.
func (l *Logger) Fatalf(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	l.stdLogger.Printf("[FATAL] %s", msg)
	if err := l.sendAlert(FATAL, msg); err != nil {
		l.stdLogger.Printf("[ERROR] Failed to send Feishu alert: %v", err)
	}
	os.Exit(1)
}

// Debugln logs a debug-level message to stdout.
func (l *Logger) Debugln(v ...interface{}) {
	msg := fmt.Sprintln(v...)
	l.stdLogger.Printf("[DEBUG] %s", msg)
	if err := l.sendAlert(DEBUG, msg); err != nil {
		l.stdLogger.Printf("[ERROR] Failed to send Feishu alert: %v", err)
	}
}

// Println logs an info-level message to stdout (alias for Infoln).
func (l *Logger) Println(v ...interface{}) {
	l.Infoln(v...)
}

// Infoln logs an info-level message to stdout.
func (l *Logger) Infoln(v ...interface{}) {
	msg := fmt.Sprintln(v...)
	l.stdLogger.Printf("[INFO] %s", msg)
	if err := l.sendAlert(INFO, msg); err != nil {
		l.stdLogger.Printf("[ERROR] Failed to send Feishu alert: %v", err)
	}
}

// Warnln logs a warn-level message to stdout and sends a Feishu alert if level >= minLevel.
func (l *Logger) Warnln(v ...interface{}) {
	msg := fmt.Sprintln(v...)
	l.stdLogger.Printf("[WARN] %s", msg)
	if err := l.sendAlert(WARN, msg); err != nil {
		l.stdLogger.Printf("[ERROR] Failed to send Feishu alert: %v", err)
	}
}

// Errorln logs an error-level message to stdout and sends a Feishu alert if level >= minLevel.
func (l *Logger) Errorln(v ...interface{}) {
	msg := fmt.Sprintln(v...)
	l.stdLogger.Printf("[ERROR] %s", msg)
	if err := l.sendAlert(ERROR, msg); err != nil {
		l.stdLogger.Printf("[ERROR] Failed to send Feishu alert: %v", err)
	}
}

// Fatalln logs a fatal error to stdout, sends an alert if level >= minLevel, and exits.
func (l *Logger) Fatalln(v ...interface{}) {
	msg := fmt.Sprintln(v...)
	l.stdLogger.Printf("[FATAL] %s", msg)
	if err := l.sendAlert(FATAL, msg); err != nil {
		l.stdLogger.Printf("[ERROR] Failed to send Feishu alert: %v", err)
	}
	os.Exit(1)
}
