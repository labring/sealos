package recovery

import (
	"bytes"
	"fmt"
	"os"
	"runtime"

	log "github.com/sirupsen/logrus"
)

// Go runs a function in a goroutine with panic recovery.
// If the function panics, it logs the error and stack trace.
//
//go:inline
func Go(logger *log.Entry, fn func()) {
	go func() {
		defer WithLogger(logger)
		fn()
	}()
}

// WithLogger recovers from panic and logs the error.
// This is intended to be used with defer in goroutines.
//
//go:inline
func WithLogger(logger *log.Entry) {
	if r := recover(); r != nil {
		stack := stack(3)
		if err, ok := r.(error); ok {
			logger.WithError(err).Errorf("Panic recovered\n%s", stack)
		} else {
			logger.Errorf("Panic recovered: %v\n%s", r, stack)
		}
	}
}

// stack returns a nicely formatted stack frame, skipping skip frames.
func stack(skip int) []byte {
	buf := new(bytes.Buffer)
	var (
		lines    [][]byte
		lastFile string
	)

	for i := skip; ; i++ {
		pc, file, line, ok := runtime.Caller(i)
		if !ok {
			break
		}

		fmt.Fprintf(buf, "%s:%d (0x%x)\n", file, line, pc)

		if file != lastFile {
			data, err := os.ReadFile(file)
			if err != nil {
				continue
			}
			lines = bytes.Split(data, []byte{'\n'})
			lastFile = file
		}

		fmt.Fprintf(buf, "\t%s: %s\n", function(pc), source(lines, line))
	}

	return buf.Bytes()
}

// source returns a space-trimmed slice of the n'th line.
func source(lines [][]byte, n int) []byte {
	n-- // in stack trace, lines are 1-indexed but our array is 0-indexed
	if n < 0 || n >= len(lines) {
		return dunno
	}
	return bytes.TrimSpace(lines[n])
}

var (
	dunno     = []byte("???")
	centerDot = []byte("·")
	dot       = []byte(".")
	slash     = []byte("/")
)

// function returns, if possible, the name of the function containing the PC.
func function(pc uintptr) []byte {
	fn := runtime.FuncForPC(pc)
	if fn == nil {
		return dunno
	}

	name := []byte(fn.Name())
	// The name includes the path name to the package, which is unnecessary
	// since the file name is already included. Plus, it has center dots.
	// That is, we see
	//    runtime/debug.*T·ptrmethod
	// and want
	//    *T.ptrmethod
	// Also the package path might contain dot (e.g. code.google.com/...),
	// so first eliminate the path prefix
	if lastSlash := bytes.LastIndex(name, slash); lastSlash >= 0 {
		name = name[lastSlash+1:]
	}

	if period := bytes.Index(name, dot); period >= 0 {
		name = name[period+1:]
	}

	name = bytes.ReplaceAll(name, centerDot, dot)

	return name
}
