// Copyright © 2021 sealos.
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

package hosts

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"strings"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	stringsutils "github.com/labring/sealos/pkg/utils/strings"

	"github.com/emirpasic/gods/maps/linkedhashmap"
)

type HostFile struct {
	Path string
}

type hostname struct {
	Comment string
	Domain  string
	IP      string
}

func newHostname(comment string, domain string, ip string) *hostname {
	return &hostname{comment, domain, ip}
}

func (h *hostname) toString() string {
	return h.Comment + h.IP + " " + h.Domain + "\n"
}
func appendToFile(filePath string, hostname *hostname) {
	fp, err := os.OpenFile(filePath, os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		logger.Warn("failed opening file %s : %s", filePath, err)
		return
	}
	defer fp.Close()

	_, err = fp.WriteString(hostname.toString())
	if err != nil {
		logger.Warn("failed append string: %s: %s", filePath, err)
		return
	}
}

func (h *HostFile) ParseHostFile(path string) (*linkedhashmap.Map, error) {
	if !file.IsExist(path) {
		logger.Warn("path %s is not exists", path)
		return nil, errors.New("path %s is not exists")
	}

	fp, fpErr := os.Open(path)
	if fpErr != nil {
		logger.Warn("open file '%s' failed", path)
		return nil, fmt.Errorf("open file '%s' failed ", path)
	}
	defer fp.Close()

	br := bufio.NewReader(fp)
	lm := linkedhashmap.New()
	curComment := ""
	for {
		str, rErr := br.ReadString('\n')
		if rErr == io.EOF {
			break
		}
		if len(str) == 0 || str == "\r\n" || stringsutils.IsEmptyLine(str) {
			continue
		}

		if str[0] == '#' {
			// 处理注释
			curComment += str
			continue
		}
		tmpHostnameArr := strings.Fields(str)
		curDomain := strings.Join(tmpHostnameArr[1:], " ")
		//if !iputils.CheckDomain(curDomain) {
		//	return lm, errors.New(" file contain error domain" + curDomain)
		//}
		curIP := stringsutils.TrimSpaceWS(tmpHostnameArr[0])

		checkIP := net.ParseIP(curIP)
		if checkIP == nil {
			continue
		}
		tmpHostname := newHostname(curComment, curDomain, curIP)
		lm.Put(tmpHostname.Domain, tmpHostname)
		curComment = ""
	}

	return lm, nil
}

func (h *HostFile) AppendHost(domain string, ip string) {
	if domain == "" || ip == "" {
		return
	}

	hostname := newHostname("", domain, ip)
	appendToFile(h.Path, hostname)
}

func (h *HostFile) writeToFile(hostnameMap *linkedhashmap.Map, path string) {
	if !file.IsExist(path) {
		logger.Warn("path %s is not exists", path)
		return
	}

	fp, err := os.OpenFile(path, os.O_WRONLY|os.O_TRUNC|os.O_CREATE, 0644)
	if err != nil {
		logger.Warn("open file '%s' failed: %v", path, err)
		return
	}
	defer fp.Close()

	hostnameMap.Each(func(key interface{}, value interface{}) {
		if v, ok := value.(*hostname); ok {
			_, writeErr := fp.WriteString(v.toString())
			if writeErr != nil {
				logger.Warn(writeErr)
				return
			}
		}
	})
}

func (h *HostFile) DeleteDomain(domain string) {
	if domain == "" {
		return
	}

	currHostsMap, parseErr := h.ParseHostFile(h.Path)
	if parseErr != nil {
		logger.Warn("parse file failed" + parseErr.Error())
		return
	}
	_, found := currHostsMap.Get(domain)
	if currHostsMap == nil || !found {
		return
	}
	currHostsMap.Remove(domain)
	h.writeToFile(currHostsMap, h.Path)
}

func (h *HostFile) HasDomain(domain string) (string, bool) {
	if domain == "" {
		return "", false
	}

	currHostsMap, parseErr := h.ParseHostFile(h.Path)
	if parseErr != nil {
		logger.Warn("parse file failed" + parseErr.Error())
		return "", false
	}
	value, found := currHostsMap.Get(domain)
	if currHostsMap == nil || !found {
		return "", false
	}
	if v, ok := value.(*hostname); ok {
		return v.IP, true
	}
	return "", false
}

func (h *HostFile) ListCurrentHosts() {
	currHostsMap, parseErr := h.ParseHostFile(h.Path)
	if parseErr != nil {
		logger.Warn("parse file failed" + parseErr.Error())
		return
	}
	if currHostsMap == nil {
		return
	}
	currHostsMap.Each(func(key interface{}, value interface{}) {
		if v, ok := value.(*hostname); ok {
			fmt.Print(v.toString())
		}
	})
}
