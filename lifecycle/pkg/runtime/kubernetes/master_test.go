// Copyright © 2025 sealos.
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

package kubernetes

import (
	"errors"
	"os"
	"path"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"

	v1beta1 "github.com/labring/sealos/pkg/types/v1beta1"
)

// --- Begin testable KubeadmRuntime for imagePull ---

type fakePathResolver struct {
	configPath string
}

func (m *fakePathResolver) RunRoot() string {
	return m.configPath
}
func (m *fakePathResolver) Root() string {
	return m.configPath
}
func (m *fakePathResolver) ConfigsPath() string {
	return m.configPath
}
func (m *fakePathResolver) TmpPath() string {
	return m.configPath
}
func (m *fakePathResolver) AdminFile() string {
	return "admin.conf"
}
func (m *fakePathResolver) EtcPath() string {
	return path.Join(m.configPath, "etc")
}
func (m *fakePathResolver) PkiPath() string {
	return path.Join(m.configPath, "pki")
}
func (m *fakePathResolver) PkiEtcdPath() string {
	return path.Join(m.configPath, "pki", "etcd")
}
func (m *fakePathResolver) RootFSPath() string {
	return path.Join(m.configPath, "rootfs")
}
func (m *fakePathResolver) RootFSBinPath() string {
	return path.Join(m.configPath, "rootfs", "bin")
}
func (m *fakePathResolver) RootFSEtcPath() string {
	return path.Join(m.configPath, "rootfs", "etc")
}
func (m *fakePathResolver) RootFSManifestsPath() string {
	return path.Join(m.configPath, "rootfs", "manifests")
}
func (m *fakePathResolver) RootFSRegistryPath() string {
	return path.Join(m.configPath, "rootfs", "registry")
}
func (m *fakePathResolver) RootFSScriptsPath() string {
	return path.Join(m.configPath, "rootfs", "scripts")
}
func (m *fakePathResolver) RootFSSealctlPath() string {
	return path.Join(m.configPath, "rootfs", "sealctl")
}
func (m *fakePathResolver) RootFSStaticsPath() string {
	return path.Join(m.configPath, "rootfs", "statics")
}

type fakeKubeadmRuntime struct {
	KubeadmRuntime

	sshCmdAsyncFunc                        func(host, cmd string) error
	getInitMasterKubeadmConfigFilePathFunc func() string
	getKubeVersionFunc                     func() string
	fileIsExistFunc                        func(string) bool
}

func (f *fakeKubeadmRuntime) sshCmdAsync(host, cmd string) error {
	if f.sshCmdAsyncFunc != nil {
		return f.sshCmdAsyncFunc(host, cmd)
	}
	return nil
}
func (f *fakeKubeadmRuntime) getInitMasterKubeadmConfigFilePath() string {
	if f.getInitMasterKubeadmConfigFilePathFunc != nil {
		return f.getInitMasterKubeadmConfigFilePathFunc()
	}
	return ""
}
func (f *fakeKubeadmRuntime) getKubeVersion() string {
	if f.getKubeVersionFunc != nil {
		return f.getKubeVersionFunc()
	}
	return ""
}
func (f *fakeKubeadmRuntime) fileIsExist(fp string) bool {
	if f.fileIsExistFunc != nil {
		return f.fileIsExistFunc(fp)
	}
	return false
}

func TestKubeadmRuntime_imagePull(t *testing.T) {
	tests := []struct {
		name          string
		hostAndPort   string
		version       string
		configFiles   map[string]string
		expectedError string
		mockSSH       bool
		sshErr        error
	}{
		{
			name:          "missing config files",
			hostAndPort:   "192.168.1.10:22",
			version:       "v1.20.0",
			expectedError: "kubeadm config files not found, please check if the kubeadm configs are generated",
			mockSSH:       false,
		},
		{
			name:        "all config files exist",
			hostAndPort: "192.168.1.10:22",
			version:     "v1.20.0",
			configFiles: map[string]string{
				"kubeadm-init.yaml":        "init config content",
				"kubeadm-join-master.yaml": "join master config content",
				"kubeadm-join-node.yaml":   "join node config content",
				"kubeadm-update.yaml":      "update config content",
			},
			mockSSH: true,
		},
		{
			name:        "empty version",
			hostAndPort: "192.168.1.10:22",
			version:     "",
			configFiles: map[string]string{
				"kubeadm-init.yaml":        "init config content",
				"kubeadm-join-master.yaml": "join master config content",
				"kubeadm-join-node.yaml":   "join node config content",
				"kubeadm-update.yaml":      "update config content",
			},
			mockSSH: true,
		},
		{
			name:        "ssh command fails",
			hostAndPort: "192.168.1.10:22",
			version:     "v1.20.0",
			configFiles: map[string]string{
				"kubeadm-init.yaml":        "init config content",
				"kubeadm-join-master.yaml": "join master config content",
				"kubeadm-join-node.yaml":   "join node config content",
				"kubeadm-update.yaml":      "update config content",
			},
			mockSSH:       true,
			sshErr:        errors.New("ssh fail"),
			expectedError: "master pull image failed, error: ssh fail",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir := t.TempDir()

			cluster := &v1beta1.Cluster{
				Spec: v1beta1.ClusterSpec{
					Image: v1beta1.ImageList{},
				},
			}

			rt := &fakeKubeadmRuntime{
				KubeadmRuntime: KubeadmRuntime{
					pathResolver: &fakePathResolver{configPath: tmpDir},
					cluster:      cluster,
				},
			}

			// Write config files if needed
			if tt.configFiles != nil {
				for filename, content := range tt.configFiles {
					filePath := path.Join(tmpDir, filename)
					err := os.WriteFile(filePath, []byte(content), 0644)
					assert.NoError(t, err)
				}
			}

			rt.getInitMasterKubeadmConfigFilePathFunc = func() string {
				return path.Join(tmpDir, "kubeadm-init.yaml")
			}
			if tt.version == "" {
				rt.getKubeVersionFunc = func() string { return "v1.22.0" }
			} else {
				rt.getKubeVersionFunc = func() string { return tt.version }
			}
			rt.klogLevel = 0

			fileExistsSet := map[string]bool{}
			if tt.configFiles != nil {
				for filename := range tt.configFiles {
					fileExistsSet[path.Join(tmpDir, filename)] = true
				}
			}
			rt.fileIsExistFunc = func(fp string) bool {
				return fileExistsSet[fp]
			}
			rt.sshCmdAsyncFunc = func(host, cmd string) error {
				if tt.mockSSH {
					return tt.sshErr
				}
				return nil
			}

			// Actually run the imagePull
			err := imagePullWrapper(rt, tt.hostAndPort, tt.version)

			if tt.expectedError != "" {
				assert.EqualError(t, err, tt.expectedError)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// imagePullWrapper is a helper to call imagePull with method overrides for testing.
func imagePullWrapper(rt *fakeKubeadmRuntime, hostAndPort, version string) error {
	return imagePullFake(rt, hostAndPort, version)
}

// imagePullFake is a copy of imagePull but with test double hooks for 'file.IsExist'
func imagePullFake(k *fakeKubeadmRuntime, hostAndPort, version string) error {
	if version == "" {
		version = k.getKubeVersion()
	}
	initConfigPath := k.getInitMasterKubeadmConfigFilePath()
	joinMasterConfigPath := path.Join(k.pathResolver.ConfigsPath(), defaultJoinMasterKubeadmFileName)
	joinNodeConfigPath := path.Join(k.pathResolver.ConfigsPath(), defaultJoinNodeKubeadmFileName)
	updateClusterConfigPath := path.Join(k.pathResolver.ConfigsPath(), defaultUpdateKubeadmFileName)
	if !k.fileIsExist(initConfigPath) || !k.fileIsExist(joinMasterConfigPath) || !k.fileIsExist(joinNodeConfigPath) || !k.fileIsExist(updateClusterConfigPath) {
		return errors.New("kubeadm config files not found, please check if the kubeadm configs are generated")
	}
	configFiles := []string{
		initConfigPath,
		joinMasterConfigPath,
		joinNodeConfigPath,
		updateClusterConfigPath,
	}
	var configFlag string
	for _, configFile := range configFiles {
		if k.fileIsExist(configFile) {
			configFlag = "--config " + configFile + " "
		}
	}
	imagePull := "kubeadm config images pull " + configFlag + " --kubernetes-version " + version + " "
	err := k.sshCmdAsync(hostAndPort, imagePull)
	if err != nil {
		return errors.New("master pull image failed, error: " + err.Error())
	}
	return nil
}

// Add a simple test for sendJoinCPConfig to check locking and error handling
func TestKubeadmRuntime_sendJoinCPConfig(t *testing.T) {
	type call struct {
		master string
	}
	var mu sync.Mutex
	calls := []call{}
	rt := &KubeadmRuntime{
		mu: sync.Mutex{},
	}
	// Use a wrapper struct to allow us to swap out ConfigJoinMasterKubeadmToMaster
	type joinCPConfigRuntime struct {
		*KubeadmRuntime
		ConfigJoinMasterKubeadmToMasterFunc func(string) error
	}
	jrt := &joinCPConfigRuntime{
		KubeadmRuntime: rt,
	}
	origFunc := func(master string) error {
		return rt.ConfigJoinMasterKubeadmToMaster(master)
	}
	jrt.ConfigJoinMasterKubeadmToMasterFunc = origFunc

	// Patch sendJoinCPConfig to use our wrapper
	sendJoinCPConfig := func(joinMaster []string) error {
		eg := &fakeErrGroup{}
		for _, master := range joinMaster {
			master := master
			eg.Go(func() error {
				rt.mu.Lock()
				defer rt.mu.Unlock()
				return jrt.ConfigJoinMasterKubeadmToMasterFunc(master)
			})
		}
		return eg.Wait()
	}

	// Should succeed for all
	jrt.ConfigJoinMasterKubeadmToMasterFunc = func(master string) error {
		mu.Lock()
		defer mu.Unlock()
		calls = append(calls, call{master: master})
		if master == "fail" {
			return errors.New("fail-err")
		}
		return nil
	}
	err := sendJoinCPConfig([]string{"m1", "m2"})
	assert.NoError(t, err)
	mu.Lock()
	assert.ElementsMatch(t, []call{{"m1"}, {"m2"}}, calls)
	mu.Unlock()

	// Should return error if any fails
	calls = []call{}
	jrt.ConfigJoinMasterKubeadmToMasterFunc = func(master string) error {
		if master == "fail" {
			return errors.New("fail-err")
		}
		return nil
	}
	err = sendJoinCPConfig([]string{"ok", "fail"})
	assert.Error(t, err)
}

// fakeErrGroup is a simple implementation of errgroup for testing.
type fakeErrGroup struct {
	wg   sync.WaitGroup
	errs []error
	mu   sync.Mutex
}

func (eg *fakeErrGroup) Go(fn func() error) {
	eg.wg.Add(1)
	go func() {
		defer eg.wg.Done()
		if err := fn(); err != nil {
			eg.mu.Lock()
			eg.errs = append(eg.errs, err)
			eg.mu.Unlock()
		}
	}()
}

func (eg *fakeErrGroup) Wait() error {
	eg.wg.Wait()
	if len(eg.errs) > 0 {
		return eg.errs[0]
	}
	return nil
}
