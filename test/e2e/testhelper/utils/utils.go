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

package utils

import (
	"bufio"
	"bytes"
	"debug/elf"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	exec2 "os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/labring/sealos/test/e2e/testhelper/consts"

	utilyaml "k8s.io/apimachinery/pkg/util/yaml"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/onsi/ginkgo/v2"

	"github.com/labring/sealos/pkg/utils/exec"

	"github.com/onsi/gomega"
	"github.com/onsi/gomega/gexec"
	"sigs.k8s.io/yaml"
)

func GetPwd() string {
	pwd, err := os.Getwd()
	CheckErr(err)
	return pwd
}

func CreateTempFile() string {
	dir := os.TempDir()
	file, err := os.CreateTemp(dir, "tmpfile")
	CheckErr(err)
	defer CheckErr(file.Close())
	return file.Name()
}

func RemoveTempFile(file string) {
	CheckErr(os.Remove(file))
}

func WriteFile(fileName string, content []byte) error {
	dir := filepath.Dir(fileName)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err = os.MkdirAll(dir, consts.FileMode0755); err != nil {
			return err
		}
	}

	return os.WriteFile(fileName, content, consts.FileMode0644)
}

func GetBinArch(filepath string) (string, error) {
	f, err := elf.Open(filepath)
	if err != nil {
		return "", fmt.Errorf("error opening file: %v", err)
	}
	defer f.Close()
	switch f.Machine {
	case elf.EM_X86_64:
		return consts.Amd64Arch, nil
	case elf.EM_AARCH64:
		return consts.Arm64Arch, nil
	default:
		return "", fmt.Errorf("unknown or unsupported architecture: %v", f.Machine.String())
	}
}

func GetBinPath(bin string) (string, error) {
	return exec2.LookPath(bin)
}

func IsFileExist(filename string) bool {
	_, err := os.Stat(filename)
	return !os.IsNotExist(err)
}

func UnmarshalYamlFile(file string, obj interface{}) error {
	data, err := os.ReadFile(filepath.Clean(file))
	if err != nil {
		return err
	}
	err = yaml.Unmarshal(data, obj)
	return err
}

func UnmarshalData(metadata []byte) (map[string]interface{}, error) {
	var data map[string]interface{}
	err := yaml.Unmarshal(metadata, &data)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func MarshalYamlToFile(file string, obj interface{}) error {
	data, err := yaml.Marshal(obj)
	if err != nil {
		return err
	}
	return WriteFile(file, data)
}

// GetFileDataLocally get file data for cloud apply
func GetFileDataLocally(filePath string) string {
	cmd := fmt.Sprintf("sudo -E cat %s", filePath)
	result, err := exec.RunBashCmd(cmd)
	CheckErr(err)
	return result
}

// DeleteFileLocally delete file for cloud apply
func DeleteFileLocally(filePath string) {
	cmd := fmt.Sprintf("sudo -E rm -rf %s", filePath)
	_, err := exec.RunBashCmd(cmd)
	CheckErr(err)
}

func CheckEnvSetting(keys []string) {
	for _, key := range keys {
		if val, ok := os.LookupEnv(key); !ok || val == "" {
			CheckErr(fmt.Errorf("env %s not set", key))
		}
	}
}

func CheckErr(err error, explainErrMsg ...string) {
	if err != nil {
		if len(explainErrMsg) != 0 {
			err = errors.New(strings.Join(explainErrMsg, "  ,"))
		}
		logger.Error(err)
	}
	gomega.Expect(err).NotTo(gomega.HaveOccurred())
}

func Log(msg string) {
	Logf(msg)
}

func Logf(format string, args ...interface{}) {
	fmt.Fprintf(ginkgo.GinkgoWriter, "INFO: "+format, args...)
}

func Failf(msg string) {
	ginkgo.Fail(fmt.Sprintf("FAIL: %s", msg), 1)
}

func CheckNotNil(obj interface{}) {
	gomega.Expect(obj).NotTo(gomega.BeNil())
}

func CheckEqual(obj1 interface{}, obj2 interface{}) {
	gomega.Expect(obj1).To(gomega.Equal(obj2))
}

func CheckNotEqual(obj1 interface{}, obj2 interface{}) {
	gomega.Expect(obj1).NotTo(gomega.Equal(obj2))
}

func CheckExit0(sess *gexec.Session, waitTime time.Duration) {
	gomega.Eventually(sess, waitTime).Should(gexec.Exit(0))
}
func CheckNotExit0(sess *gexec.Session, waitTime time.Duration) {
	gomega.Eventually(sess, waitTime).ShouldNot(gexec.Exit(0))
}

func CheckFuncBeTrue(f func() bool, t time.Duration) {
	gomega.Eventually(f(), t).Should(gomega.BeTrue())
}

func CheckBeTrue(b bool) {
	gomega.Eventually(b).Should(gomega.BeTrue())
}
func CheckNotBeTrue(b bool) {
	gomega.Eventually(b).ShouldNot(gomega.BeTrue())
}

func ToYalms(bs string) (yamls []string) {
	buf := bytes.NewBuffer([]byte(bs))
	reader := utilyaml.NewYAMLReader(bufio.NewReader(buf))
	for {
		patch, err := reader.Read()
		if err != nil {
			if err == io.EOF {
				break
			}
			break
		}
		patch = bytes.TrimSpace(patch)
		if len(patch) == 0 {
			continue
		}
		yamls = append(yamls, string(patch))
	}
	return
}

func GetAllSubDirs(rootPath string) ([]string, error) {
	dirs := make([]string, 0)
	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			dirs = append(dirs, path)
		}
		return nil
	})
	return dirs, err
}

func ListLocalHostAddrs() (*[]net.Addr, error) {
	netInterfaces, err := net.Interfaces()
	if err != nil {
		logger.Warn("net.Interfaces failed, err:", err.Error())
		return nil, err
	}
	var allAddrs []net.Addr
	for i := 0; i < len(netInterfaces); i++ {
		if (netInterfaces[i].Flags & net.FlagUp) == 0 {
			continue
		}
		addrs, err := netInterfaces[i].Addrs()
		if err != nil {
			logger.Warn("failed to get Addrs, %s", err.Error())
		}
		for j := 0; j < len(addrs); j++ {
			allAddrs = append(allAddrs, addrs[j])
		}
	}
	return &allAddrs, nil
}

func LocalIP(addrs *[]net.Addr) string {
	for _, address := range *addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
			return ipnet.IP.String()
		}
	}
	return ""
}

func GetLocalIpv4() string {
	addr, _ := ListLocalHostAddrs()
	Ipv4 := LocalIP(addr)
	return Ipv4
}

// MkTmpdir creates a temporary directory.
func MkTmpdir(dir string) (string, error) {
	tempDir, err := os.MkdirTemp(dir, "DTmp-")
	if err != nil {
		return "", err
	}
	return tempDir, os.MkdirAll(tempDir, 0755)
}
