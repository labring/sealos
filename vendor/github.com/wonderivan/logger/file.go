package logger

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type fileLogger struct {
	sync.RWMutex
	fileWriter *os.File

	Filename   string `json:"filename"`
	Append     bool   `json:"append"`
	MaxLines   int    `json:"maxlines"`
	MaxSize    int    `json:"maxsize"`
	Daily      bool   `json:"daily"`
	MaxDays    int64  `json:"maxdays"`
	Level      string `json:"level"`
	PermitMask string `json:"permit"`

	LogLevel             int
	maxSizeCurSize       int
	maxLinesCurLines     int
	dailyOpenDate        int
	dailyOpenTime        time.Time
	fileNameOnly, suffix string
}

// Init file logger with json config.
// jsonConfig like:
//	{
//	"filename":"log/app.log",
//	"maxlines":10000,
//	"maxsize":1024,
//	"daily":true,
//	"maxdays":15,
//	"rotate":true,
//  	"permit":"0600"
//	}
func (f *fileLogger) Init(jsonConfig string) error {
	fmt.Printf("fileLogger Init:%s\n", jsonConfig)
	if len(jsonConfig) == 0 {
		return nil
	}
	err := json.Unmarshal([]byte(jsonConfig), f)
	if err != nil {
		return err
	}
	if len(f.Filename) == 0 {
		return errors.New("jsonconfig must have filename")
	}
	f.suffix = filepath.Ext(f.Filename)
	f.fileNameOnly = strings.TrimSuffix(f.Filename, f.suffix)
	f.MaxSize *= 1024 * 1024 // 将单位转换成MB
	if f.suffix == "" {
		f.suffix = ".log"
	}
	if l, ok := LevelMap[f.Level]; ok {
		f.LogLevel = l
	}
	err = f.newFile()
	return err
}

func (f *fileLogger) needCreateFresh(size int, day int) bool {
	return (f.MaxLines > 0 && f.maxLinesCurLines >= f.MaxLines) ||
		(f.MaxSize > 0 && f.maxSizeCurSize+size >= f.MaxSize) ||
		(f.Daily && day != f.dailyOpenDate)

}

// WriteMsg write logger message into file.
func (f *fileLogger) LogWrite(when time.Time, msgText interface{}, level int) error {
	msg, ok := msgText.(string)
	if !ok {
		return nil
	}
	if level > f.LogLevel {
		return nil
	}

	day := when.Day()
	msg += "\n"
	if f.Append {
		f.RLock()
		if f.needCreateFresh(len(msg), day) {
			f.RUnlock()
			f.Lock()
			if f.needCreateFresh(len(msg), day) {
				if err := f.createFreshFile(when); err != nil {
					fmt.Fprintf(os.Stderr, "createFreshFile(%q): %s\n", f.Filename, err)
				}
			}
			f.Unlock()
		} else {
			f.RUnlock()
		}
	}

	f.Lock()
	_, err := f.fileWriter.Write([]byte(msg))
	if err == nil {
		f.maxLinesCurLines++
		f.maxSizeCurSize += len(msg)
	}
	f.Unlock()
	return err
}

func (f *fileLogger) createLogFile() (*os.File, error) {
	// Open the log file
	perm, err := strconv.ParseInt(f.PermitMask, 8, 64)
	if err != nil {
		return nil, err
	}
	fd, err := os.OpenFile(f.Filename, os.O_WRONLY|os.O_APPEND|os.O_CREATE, os.FileMode(perm))
	if err == nil {
		// Make sure file perm is user set perm cause of `os.OpenFile` will obey umask
		os.Chmod(f.Filename, os.FileMode(perm))
	}
	return fd, err
}

func (f *fileLogger) newFile() error {
	file, err := f.createLogFile()
	if err != nil {
		return err
	}
	if f.fileWriter != nil {
		f.fileWriter.Close()
	}
	f.fileWriter = file

	fInfo, err := file.Stat()
	if err != nil {
		return fmt.Errorf("get stat err: %s", err)
	}
	f.maxSizeCurSize = int(fInfo.Size())
	f.dailyOpenTime = time.Now()
	f.dailyOpenDate = f.dailyOpenTime.Day()
	f.maxLinesCurLines = 0
	if f.maxSizeCurSize > 0 {
		count, err := f.lines()
		if err != nil {
			return err
		}
		f.maxLinesCurLines = count
	}
	return nil
}

func (f *fileLogger) lines() (int, error) {
	fd, err := os.Open(f.Filename)
	if err != nil {
		return 0, err
	}
	defer fd.Close()

	buf := make([]byte, 32768) // 32k
	count := 0
	lineSep := []byte{'\n'}

	for {
		c, err := fd.Read(buf)
		if err != nil && err != io.EOF {
			return count, err
		}

		count += bytes.Count(buf[:c], lineSep)

		if err == io.EOF {
			break
		}
	}

	return count, nil
}

// new file name like  xx.2013-01-01.001.log
func (f *fileLogger) createFreshFile(logTime time.Time) error {
	// file exists
	// Find the next available number
	num := 1
	fName := ""
	rotatePerm, err := strconv.ParseInt(f.PermitMask, 8, 64)
	if err != nil {
		return err
	}

	_, err = os.Lstat(f.Filename)
	if err != nil {
		// 初始日志文件不存在，无需创建新文件
		goto RESTART_LOGGER
	}
	// 日期变了， 说明跨天，重命名时需要保存为昨天的日期
	if f.dailyOpenDate != logTime.Day() {
		for ; err == nil && num <= 999; num++ {
			fName = f.fileNameOnly + fmt.Sprintf(".%s.%03d%s", f.dailyOpenTime.Format("2006-01-02"), num, f.suffix)
			_, err = os.Lstat(fName)
		}
	} else { //如果仅仅是文件大小或行数达到了限制，仅仅变更后缀序号即可
		for ; err == nil && num <= 999; num++ {
			fName = f.fileNameOnly + fmt.Sprintf(".%s.%03d%s", logTime.Format("2006-01-02"), num, f.suffix)
			_, err = os.Lstat(fName)
		}
	}

	if err == nil {
		return fmt.Errorf("Cannot find free log number to rename %s", f.Filename)
	}
	f.fileWriter.Close()

	// 当创建新文件标记为true时
	// 当日志文件超过最大限制行
	// 当日志文件超过最大限制字节
	// 当日志文件隔天更新标记为true时
	// 将旧文件重命名，然后创建新文件
	err = os.Rename(f.Filename, fName)
	if err != nil {
		fmt.Fprintf(os.Stderr, "os.Rename %s to %s err:%s\n", f.Filename, fName, err.Error())
		goto RESTART_LOGGER
	}

	err = os.Chmod(fName, os.FileMode(rotatePerm))

RESTART_LOGGER:

	startLoggerErr := f.newFile()
	go f.deleteOldLog()

	if startLoggerErr != nil {
		return fmt.Errorf("Rotate StartLogger: %s", startLoggerErr)
	}
	if err != nil {
		return fmt.Errorf("Rotate: %s", err)
	}
	return nil
}

func (f *fileLogger) deleteOldLog() {
	dir := filepath.Dir(f.Filename)
	filepath.Walk(dir, func(path string, info os.FileInfo, err error) (returnErr error) {
		defer func() {
			if r := recover(); r != nil {
				fmt.Fprintf(os.Stderr, "Unable to delete old log '%s', error: %v\n", path, r)
			}
		}()

		if info == nil {
			return
		}

		if f.MaxDays != -1 && !info.IsDir() && info.ModTime().Add(24*time.Hour*time.Duration(f.MaxDays)).Before(time.Now()) {
			if strings.HasPrefix(filepath.Base(path), filepath.Base(f.fileNameOnly)) &&
				strings.HasSuffix(filepath.Base(path), f.suffix) {
				os.Remove(path)
			}
		}
		return
	})
}

func (f *fileLogger) Destroy() {
	f.fileWriter.Close()
}

func init() {
	Register(AdapterFile, &fileLogger{
		Daily:      true,
		MaxDays:    7,
		Append:     true,
		LogLevel:   LevelDebug,
		PermitMask: "0777",
		MaxLines:   10,
		MaxSize:    10 * 1024 * 1024,
	})
}
