package logger

import (
	"testing"
)

// Try each log level in decreasing order of priority.
func testConsoleCalls(bl *LocalLogger) {
	bl.Emer("emergency")
	bl.Alert("alert")
	bl.Crit("critical")
	bl.Error("error")
	bl.Warn("warning")
	bl.Debug("notice")
	bl.Info("informational")
	bl.Trace("trace")
}

func TestConsole(t *testing.T) {
	log1 := NewLogger()
	log1.SetLogger("console", "")
	testConsoleCalls(log1)

	log2 := NewLogger()
	log2.SetLogger("console", `{"level":"EROR"}`)
	testConsoleCalls(log2)
}

// Test console without color
func TestNoColorConsole(t *testing.T) {
	log := NewLogger()
	log.SetLogger("console", `{"color":false}`)
	testConsoleCalls(log)
}
