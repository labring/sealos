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

package progress

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	http2 "github.com/labring/sealos/pkg/utils/http"

	"github.com/schollz/progressbar/v3"
)

func Download(srcFile, destFile string) error {
	sourceName, destName := srcFile, destFile
	var source io.Reader
	var sourceSize int64
	if _, ok := http2.IsURL(srcFile); ok {
		// open as url
		resp, err := http.Get(sourceName)
		if err != nil {
			return fmt.Errorf("can't get %s: %v", sourceName, err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("server return non-200 status: %v", resp.Status)
		}
		i, _ := strconv.Atoi(resp.Header.Get("Content-Length"))
		sourceSize = int64(i)
		source = resp.Body
	} else {
		// open as file
		s, err := os.Open(sourceName)
		if err != nil {
			return fmt.Errorf("can't open %s: %v", sourceName, err)
		}
		defer s.Close()
		// get source size
		sourceStat, err := s.Stat()
		if err != nil {
			return fmt.Errorf("can't stat %s: %v", sourceName, err)
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
		progressbar.OptionShowCount(),
		progressbar.OptionSetDescription("[cyan][1/1][reset] Waiting downloading file..."),
		progressbar.OptionSetTheme(progressbar.Theme{
			Saucer:        "[green]=[reset]",
			SaucerHead:    "[green]>[reset]",
			SaucerPadding: " ",
			BarStart:      "[",
			BarEnd:        "]",
		}))
	_, _ = io.Copy(io.MultiWriter(f, bar), source)
	return nil
}
