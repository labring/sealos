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
	"os"
	"strings"

	strings2 "github.com/fanux/sealos/pkg/utils/strings"

	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/iputils"

	"github.com/fanux/sealos/pkg/utils/logger"
)

type HostFile struct {
	Path  string
	Hosts map[string]*Hostname
}

type Hostname struct {
	Comment string
	Domain  string
	IP      string
}

func NewHostname(comment string, domain string, ip string) *Hostname {
	return &Hostname{comment, domain, ip}
}
func (h *HostFile) Add(host *Hostname) {
	if h.Hosts == nil {
		h.Hosts = make(map[string]*Hostname)
	}
	h.Hosts[host.Domain] = host
}

func (h *HostFile) Delete(host string) {
	delete(h.Hosts, host)
}

func getHostPath() string {
	path := os.Getenv("GOHOST_FILE")
	if path == "" {
		path = "/etc/hosts"
	}
	return path
}

func (h *Hostname) toString() string {
	if len(h.Comment) > 0 {
		h.Comment += "\n"
	}
	return h.Comment + h.IP + " " + h.Domain + "\n"
}
func appendToFile(filePath string, hostname *Hostname) {
	fp, err := os.OpenFile(filePath, os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		logger.Warn("failed opening file %s : %s\n", filePath, err)
		return
	}
	defer fp.Close()

	_, err = fp.WriteString(hostname.toString())
	if err != nil {
		logger.Warn("failed append string: %s: %s\n", filePath, err)
		return
	}
}

func (h *HostFile) ParseHostFile(path string) (map[string]*Hostname, error) {
	if !file.IsExist(path) {
		logger.Warn("path %s is not exists", path)
		return nil, errors.New("path %s is not exists")
	}

	fp, fpErr := os.Open(path)
	if fpErr != nil {
		logger.Warn("open file '%s' failed\n", path)
		return nil, fmt.Errorf("open file '%s' failed ", path)
	}
	defer fp.Close()

	br := bufio.NewReader(fp)
	hostnameMap := make(map[string]*Hostname)
	curComment := ""
	for {
		str, rErr := br.ReadString('\n')
		if rErr == io.EOF {
			break
		}
		if len(str) == 0 || str == "\r\n" || strings2.IsEmptyLine(str) {
			continue
		}

		if str[0] == '#' {
			// 处理注释
			curComment += str
			continue
		}
		tmpHostnameArr := strings.Fields(str)
		curDomain := strings2.TrimSpaceWS(tmpHostnameArr[1])
		if !iputils.CheckDomain(curDomain) {
			return hostnameMap, errors.New(" file contain error domain" + curDomain)
		}
		curIP := strings2.TrimSpaceWS(tmpHostnameArr[0])
		checkIP := iputils.CheckIP(curIP)
		if !checkIP {
			return hostnameMap, nil
		}
		tmpHostname := NewHostname(curComment, curDomain, curIP)
		hostnameMap[tmpHostname.Domain] = tmpHostname

		curComment = ""
	}

	return hostnameMap, nil
}

func (h *HostFile) AppendHost(domain string, ip string) {
	if domain == "" || ip == "" {
		return
	}

	hostname := NewHostname("", domain, ip)
	appendToFile(getHostPath(), hostname)
}

func (h *HostFile) writeToFile(hostnameMap map[string]*Hostname, path string) {
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

	for _, mapVal := range hostnameMap {
		_, writeErr := fp.WriteString(mapVal.toString())
		if writeErr != nil {
			logger.Warn(writeErr)
			return
		}
	}
}

func (h *HostFile) DeleteDomain(domain string) {
	if domain == "" {
		return
	}

	currHostsMap, parseErr := h.ParseHostFile(getHostPath())
	if parseErr != nil {
		logger.Warn("parse file failed" + parseErr.Error())
		return
	}

	if len(currHostsMap) == 0 || currHostsMap[domain] == nil {
		logger.Warn("domain %s not exist\n", domain)
		return
	}

	delete(currHostsMap, domain)
	h.writeToFile(currHostsMap, getHostPath())
}

func (h *HostFile) ListCurrentHosts() {
	currHostsMap, parseErr := h.ParseHostFile(getHostPath())
	if parseErr != nil {
		logger.Warn("parse file failed" + parseErr.Error())
		return
	}
	if len(currHostsMap) == 0 {
		return
	}

	for _, mapVal := range currHostsMap {
		fmt.Println(mapVal.toString())
	}
}
