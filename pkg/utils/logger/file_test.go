// Copyright © 2021 github.com/wonderivan/logger
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package logger

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"sync"
	"testing"
	"time"
)

func TestFilePermit(t *testing.T) {
	tempDir := t.TempDir()
	logFile := tempDir + "/test.log"

	log := NewLogger()
	log.SetLogger(AdapterFile, `{"filename":"`+logFile+`",
	"permit": "0666",
	"maxlines":100000,
	"maxsize":1,
	"append":true} `)

	log.Trace("trace")
	log.Debug("debug")
	log.Info("info")
	log.Debug("notice")
	log.Warn("warning")
	log.Error("error")
	log.Alert("alert")
	log.Crit("critical")
	log.Emer("emergency")

	file, err := os.Stat(logFile)
	if err != nil {
		t.Fatal(err)
	}
	if file.Mode() != 0666 {
		t.Fatal("unexpected log file permission")
	}

	os.Remove(logFile)
}

func TestFileLine(t *testing.T) {
	tempDir := t.TempDir()
	logFile := tempDir + "/test2.log"

	log := NewLogger()
	log.SetLogger("file", `{"filename":"`+logFile+`"}`)
	log.Debug("debug")
	log.Info("info")
	log.Debug("debug")
	log.Warn("warning")
	log.Error("error")
	log.Alert("alert")
	log.Crit("critical")
	log.Emer("emergency")
	f, err := os.Open(logFile)
	if err != nil {
		t.Fatal(err)
	}
	b := bufio.NewReader(f)
	lineNum := 0
	for {
		line, _, err := b.ReadLine()
		if err != nil {
			break
		}
		if len(line) > 0 {
			lineNum++
		}
	}
	// without 2 debug log
	var expected = LevelTrace - 1
	if lineNum != int(expected) {
		t.Fatal(lineNum, "not "+strconv.Itoa(int(expected))+" lines")
	}

	os.Remove(logFile)
}

func TestFileSize(t *testing.T) {
	tempDir := t.TempDir()
	logFile := tempDir + "/test2.log"

	log := NewLogger()
	log.SetLogger(AdapterFile, `{"filename":"`+logFile+`",
	"permit": "0666",
	"maxlines":10000,
	"maxsize":10240,
	"append":true} `)
	for i := 0; i < 1000; i++ {
		log.Trace("trace")
		log.Debug("debug")
		log.Info("info")
		log.Debug("notice")
		log.Warn("warning")
		log.Error("error")
		log.Alert("alert")
		log.Crit("critical")
		log.Emer("emergency")
		time.Sleep(time.Millisecond)
	}

	os.Remove(logFile)
}

func TestFileByMaxLine(t *testing.T) {
	tempDir := t.TempDir()
	logFile := tempDir + "/test2.log"

	log := NewLogger()
	log.SetLogger("file", `{"filename":"`+logFile+`","maxlines":4}`)
	log.Debug("debug")
	log.Info("info")
	log.Warn("warning")
	log.Error("error")
	log.Alert("alert")
	log.Crit("critical")
	log.Emer("emergency")
	rotateName := tempDir + "/test2" + fmt.Sprintf(".%s.%03d", time.Now().Format("2006-01-02"), 1) + ".log"
	b, err := exists(rotateName)
	if !b || err != nil {
		os.Remove(logFile)
		t.Fatal("rotate not generated")
	}

	os.Remove(rotateName)
	os.Remove(logFile)
}

func TestFileByTime(t *testing.T) {
	tempDir := t.TempDir()
	fn1 := tempDir + "rotate_day.log"
	fn2 := tempDir + "rotate_day" + fmt.Sprintf(".%s.%03d", time.Now().Add(-24*time.Hour).Format("2006-01-02"), 1) + ".log"

	fw := &fileLogger{
		Daily:      true,
		MaxDays:    7,
		Append:     true,
		LogLevel:   LevelTrace,
		PermitMask: "0660",
	}
	err := fw.Init(fmt.Sprintf(`{"filename":"%v","maxdays":1}`, fn1))
	if err != nil {
		fmt.Println("failed to init file logger")
	}
	fw.dailyOpenTime = time.Now().Add(-24 * time.Hour)
	fw.dailyOpenDate = fw.dailyOpenTime.Day()
	err = fw.LogWrite(time.Now(), "this is a msg for test", LevelTrace)
	if err != nil {
		fmt.Println("failed to write msg to file logger")
	}
	for _, file := range []string{fn1, fn2} {
		_, err := os.Stat(file)
		if err != nil {
			t.FailNow()
		}
		os.Remove(file)
	}
	fw.Destroy()
}

func exists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func BenchmarkFile(b *testing.B) {
	tempDir := b.TempDir()
	logFile := tempDir + "/test4F.log"

	b.ResetTimer()

	log := NewLogger()
	log.SetLogger("file", `{"filename":"`+logFile+`","maxlines":100000}`)
	for i := 0; i < b.N; i++ {
		log.Info("debug")
	}
	os.Remove(logFile)
}

func BenchmarkFileCallDepth(b *testing.B) {
	tempDir := b.TempDir()
	logFile := tempDir + "/test4C.log"

	b.ResetTimer()

	log := NewLogger()
	log.SetLogger("file", `{"filename":"`+logFile+`","maxlines":100000}`)
	for i := 0; i < b.N; i++ {
		log.Info("debug")
	}
	os.Remove(logFile)
}

func BenchmarkFileOnGoroutine(b *testing.B) {
	tempDir := b.TempDir()
	logFile := tempDir + "/test4O.log"

	b.ResetTimer()

	var wg sync.WaitGroup

	log := NewLogger()
	log.SetLogger("file", `{"filename":"`+logFile+`","maxlines":100000}`)
	for i := 0; i < b.N; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			log.Info("debug")
		}()
	}

	wg.Wait()
	os.Remove(logFile)
}
