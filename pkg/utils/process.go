/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package utils

import (
	"io"
	"net/http"
	"os"
	"strconv"

	"github.com/fanux/sealos/pkg/logger"
	"github.com/schollz/progressbar/v3"
)

func Process(srcFile, destFile string) {
	sourceName, destName := srcFile, destFile
	var source io.Reader
	var sourceSize int64
	if _, ok := IsURL(srcFile); ok {
		// open as url
		resp, err := http.Get(sourceName)
		if err != nil {
			logger.Error("can't get %s: %v", sourceName, err)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			logger.Warn("server return non-200 status: %v", resp.Status)
			return
		}
		i, _ := strconv.Atoi(resp.Header.Get("Content-Length"))
		sourceSize = int64(i)
		source = resp.Body
	} else {
		// open as file
		s, err := os.Open(sourceName)
		if err != nil {
			logger.Error("can't open %s: %v", sourceName, err)
			return
		}
		defer s.Close()
		// get source size
		sourceStat, err := s.Stat()
		if err != nil {
			logger.Error("Can't stat %s: %v", sourceName, err)
			return
		}
		sourceSize = sourceStat.Size()
		source = s
	}
	f, _ := os.Create(destName)
	defer f.Close()
	bar := progressbar.NewOptions(int(sourceSize),
		progressbar.OptionEnableColorCodes(true),
		progressbar.OptionShowBytes(true),
		progressbar.OptionSetWidth(15),
		progressbar.OptionSetDescription("[cyan][1/1][reset] Waiting downloading file..."),
		progressbar.OptionSetTheme(progressbar.Theme{
			Saucer:        "[green]=[reset]",
			SaucerHead:    "[green]>[reset]",
			SaucerPadding: " ",
			BarStart:      "[",
			BarEnd:        "]",
		}))
	_, _ = io.Copy(io.MultiWriter(f, bar), source)
}
