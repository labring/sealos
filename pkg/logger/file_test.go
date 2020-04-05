package logger

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"testing"
	"time"
)

func TestFilePermit(t *testing.T) {
	log := NewLogger()
	log.SetLogger(AdapterFile, `{"filename":"test.log",
	 "rotateperm": "0666",
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

	file, err := os.Stat("test.log")
	if err != nil {
		t.Fatal(err)
	}
	if file.Mode() != 0666 {
		t.Fatal("unexpected log file permission")
	}
	os.Remove("test.log")
}

func TestFileLine(t *testing.T) {
	log := NewLogger()
	log.SetLogger("file", `{"filename":"test2.log"}`)
	log.Debug("debug")
	log.Info("info")
	log.Debug("debug")
	log.Warn("warning")
	log.Error("error")
	log.Alert("alert")
	log.Crit("critical")
	log.Emer("emergency")
	f, err := os.Open("test.log")
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
	var expected = LevelTrace + 1
	if lineNum != expected {
		t.Fatal(lineNum, "not "+strconv.Itoa(expected)+" lines")
	}
	os.Remove("test2.log")
}

func TestFileSize(t *testing.T) {
	log := NewLogger()
	log.SetLogger(AdapterFile, `{"filename":"test.log",
	 "rotateperm": "0666",
	"maxlines":100000,
	"maxsize":1,
	"append":true} `)
	for i := 0; i < 3000; i++ {
		log.Trace("trace")
		log.Debug("debug")
		log.Info("info")
		log.Debug("notice")
		log.Warn("warning")
		log.Error("error")
		log.Alert("alert")
		log.Crit("critical")
		log.Emer("emergency")
		time.Sleep(time.Millisecond * 10)
	}
	// 手动删
}

func TestFileByMaxLine(t *testing.T) {
	log := NewLogger()
	log.SetLogger("file", `{"filename":"test3.log","maxlines":4}`)
	log.Debug("debug")
	log.Info("info")
	log.Warn("warning")
	log.Error("error")
	log.Alert("alert")
	log.Crit("critical")
	log.Emer("emergency")
	rotateName := "test3" + fmt.Sprintf(".%s.%03d", time.Now().Format("2006-01-02"), 1) + ".log"
	b, err := exists(rotateName)
	if !b || err != nil {
		os.Remove("test3.log")
		t.Fatal("rotate not generated")
	}
	os.Remove(rotateName)
	os.Remove("test3.log")
}

func TestFileByTime(t *testing.T) {
	fn1 := "rotate_day.log"
	fn2 := "rotate_day" + fmt.Sprintf(".%s.%03d", time.Now().Add(-24*time.Hour).Format("2006-01-02"), 1) + ".log"
	fw := &fileLogger{
		Daily:      true,
		MaxDays:    7,
		Append:     true,
		LogLevel:   LevelTrace,
		PermitMask: "0660",
	}
	fw.Init(fmt.Sprintf(`{"filename":"%v","maxdays":1}`, fn1))
	fw.dailyOpenTime = time.Now().Add(-24 * time.Hour)
	fw.dailyOpenDate = fw.dailyOpenTime.Day()
	fw.LogWrite(time.Now(), "this is a msg for test", LevelTrace)

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
	log := NewLogger()
	log.SetLogger("file", `{"filename":"test4.log"}`)
	for i := 0; i < b.N; i++ {
		log.Debug("debug")
	}
	os.Remove("test4.log")
}

func BenchmarkFileCallDepth(b *testing.B) {
	log := NewLogger()
	log.SetLogger("file", `{"filename":"test4.log"}`)
	for i := 0; i < b.N; i++ {
		log.Debug("debug")
	}
	os.Remove("test4.log")
}

func BenchmarkFileOnGoroutine(b *testing.B) {
	log := NewLogger()
	log.SetLogger("file", `{"filename":"test4.log"}`)
	for i := 0; i < b.N; i++ {
		go log.Debug("debug")
	}
	os.Remove("test4.log")
}
