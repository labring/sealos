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

package testhelper

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/exec"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/test/testhelper/settings"

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
		if err = os.MkdirAll(dir, settings.FileMode0755); err != nil {
			return err
		}
	}

	return os.WriteFile(fileName, content, settings.FileMode0644)
}

type SSHClient struct {
	RemoteHostIP string
	SSH          *ssh.SSH
}

func NewSSHClientByInfra(infra *v1beta1.Infra) *SSHClient {
	config := &ssh.SSH{
		User:     "root",
		Password: infra.Spec.Metadata.AccessChannels.SSH.Passwd,
	}
	return &SSHClient{
		RemoteHostIP: infra.Status.Cluster.EIP,
		SSH:          config,
	}
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

func CheckErr(err error) {
	gomega.Expect(err).NotTo(gomega.HaveOccurred())
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
