package recover

import (
	"bytes"
	"errors"
	"io"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	log "github.com/sirupsen/logrus"
)

func TestWithLogger_Error(t *testing.T) {
	var buf bytes.Buffer
	logger := log.New()
	logger.SetOutput(io.MultiWriter(&buf, os.Stdout))
	logger.SetFormatter(&log.TextFormatter{DisableTimestamp: true})
	entry := logger.WithField("test", "error")

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer WithLogger(entry)
		panic(errors.New("test error"))
	}()
	wg.Wait()

	output := buf.String()
	if !strings.Contains(output, "error=\"test error\"") {
		t.Errorf("expected WithError format, got: %s", output)
	}
	if !strings.Contains(output, "Panic recovered") {
		t.Errorf("expected 'Panic recovered' message, got: %s", output)
	}
	if !strings.Contains(output, "recover_test.go") {
		t.Errorf("expected stack trace with file name, got: %s", output)
	}
}

func TestWithLogger_NonError(t *testing.T) {
	var buf bytes.Buffer
	logger := log.New()
	logger.SetOutput(io.MultiWriter(&buf, os.Stdout))
	logger.SetFormatter(&log.TextFormatter{DisableTimestamp: true})
	entry := logger.WithField("test", "non-error")

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer WithLogger(entry)
		panic("string panic")
	}()
	wg.Wait()

	output := buf.String()
	if !strings.Contains(output, "Panic recovered: string panic") {
		t.Errorf("expected panic value in message, got: %s", output)
	}
	if !strings.Contains(output, "recover_test.go") {
		t.Errorf("expected stack trace with file name, got: %s", output)
	}
}

func TestGo_Error(t *testing.T) {
	var buf bytes.Buffer
	logger := log.New()
	logger.SetOutput(io.MultiWriter(&buf, os.Stdout))
	logger.SetFormatter(&log.TextFormatter{DisableTimestamp: true})
	entry := logger.WithField("test", "go-error")

	done := make(chan struct{})
	Go(entry, func() {
		defer close(done)
		panic(errors.New("go error"))
	})
	<-done

	// Wait for recover to complete logging
	time.Sleep(10 * time.Millisecond)

	output := buf.String()
	if !strings.Contains(output, "error=\"go error\"") {
		t.Errorf("expected WithError format, got: %s", output)
	}
}

func TestGo_NonError(t *testing.T) {
	var buf bytes.Buffer
	logger := log.New()
	logger.SetOutput(io.MultiWriter(&buf, os.Stdout))
	logger.SetFormatter(&log.TextFormatter{DisableTimestamp: true})
	entry := logger.WithField("test", "go-non-error")

	done := make(chan struct{})
	Go(entry, func() {
		defer close(done)
		panic(42)
	})
	<-done

	// Wait for recover to complete logging
	time.Sleep(10 * time.Millisecond)

	output := buf.String()
	if !strings.Contains(output, "Panic recovered: 42") {
		t.Errorf("expected panic value in message, got: %s", output)
	}
}

func TestGo_NoPanic(t *testing.T) {
	var buf bytes.Buffer
	logger := log.New()
	logger.SetOutput(io.MultiWriter(&buf, os.Stdout))
	entry := logger.WithField("test", "no-panic")

	done := make(chan struct{})
	Go(entry, func() {
		defer close(done)
		// no panic
	})
	<-done

	output := buf.String()
	if output != "" {
		t.Errorf("expected no output, got: %s", output)
	}
}
