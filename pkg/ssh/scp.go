// Copyright © 2021 Alibaba Group Holding Ltd.
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

package ssh

import (
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/pkg/sftp"
	"github.com/schollz/progressbar/v3"
	"golang.org/x/crypto/ssh"

	"github.com/labring/sealos/pkg/unshare"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/hash"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/progress"
)

func (s *SSH) RemoteSha256Sum(host, remoteFilePath string) string {
	cmd := fmt.Sprintf("sha256sum %s | cut -d\" \" -f1", remoteFilePath)
	remoteHash, err := s.CmdToString(host, cmd, "")
	if err != nil {
		logger.Error("failed to calculate remote sha256 sum %s %s %v", host, remoteFilePath, err)
	}
	return remoteHash
}

// CmdToString is in host exec cmd and replace to spilt str
func (s *SSH) CmdToString(host, cmd, spilt string) (string, error) {
	data, err := s.Cmd(host, cmd)
	str := string(data)
	if err != nil {
		return str, fmt.Errorf("exec remote command failed %s %s %v", host, cmd, err)
	}
	if data != nil {
		str = strings.ReplaceAll(str, "\r\n", spilt)
		str = strings.ReplaceAll(str, "\n", spilt)
		return str, nil
	}
	return str, fmt.Errorf("command %s %s return nil", host, cmd)
}

func (s *SSH) sftpConnect(host string) (*ssh.Client, *sftp.Client, error) {
	sshClient, err := s.connect(host)
	if err != nil {
		return nil, nil, err
	}
	// create sftp client
	sftpClient, err := sftp.NewClient(sshClient)
	return sshClient, sftpClient, err
}

// Copy is copy file or dir to remotePath, add md5 validate
func (s *SSH) Copy(host, localPath, remotePath string) error {
	if iputils.IsLocalIP(host, s.localAddress) && !unshare.IsRootless() {
		logger.Debug("local %s copy files src %s to dst %s", host, localPath, remotePath)
		return file.RecursionCopy(localPath, remotePath)
	}
	logger.Debug("remote copy files src %s to dst %s", localPath, remotePath)
	sshClient, sftpClient, err := s.sftpConnect(host)
	if err != nil {
		return fmt.Errorf("new sftp client failed %s", err)
	}
	defer func() {
		_ = sftpClient.Close()
		_ = sshClient.Close()
	}()

	f, err := os.Stat(localPath)
	if err != nil {
		return fmt.Errorf("get file stat failed %s", err)
	}

	remoteDir := filepath.Dir(remotePath)
	rfp, err := sftpClient.Stat(remoteDir)
	if err != nil {
		if !os.IsNotExist(err) {
			return err
		}
		if err = sftpClient.MkdirAll(remoteDir); err != nil {
			return err
		}
	} else if !rfp.IsDir() {
		return fmt.Errorf("dir of remote file %s is not a directory", remotePath)
	}
	number := 1
	if f.IsDir() {
		number = file.CountDirFiles(localPath)
		// no files in local dir, but still need to create remote dir
		if number == 0 {
			return sftpClient.MkdirAll(remotePath)
		}
	}

	var (
		bar = progress.Simple("copying files to "+host, number)
	)
	defer func() {
		_ = bar.Close()
	}()

	return s.doCopy(sftpClient, host, localPath, remotePath, bar)
}

func (s *SSH) doCopy(client *sftp.Client, host, src, dest string, epu *progressbar.ProgressBar) error {
	lfp, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("failed to Stat local: %v", err)
	}
	if lfp.IsDir() {
		entries, err := os.ReadDir(src)
		if err != nil {
			return fmt.Errorf("failed to ReadDir: %v", err)
		}
		if err = client.MkdirAll(dest); err != nil {
			return fmt.Errorf("failed to Mkdir remote: %v", err)
		}
		for _, entry := range entries {
			if err = s.doCopy(client, host, path.Join(src, entry.Name()), path.Join(dest, entry.Name()), epu); err != nil {
				return err
			}
		}
	} else {
		fn := func(host string, name string) bool {
			exists, err := checkIfRemoteFileExists(client, name)
			if err != nil {
				logger.Error("failed to detect remote file exists: %v", err)
			}
			return exists
		}
		if isEnvTrue("USE_SHELL_TO_CHECK_FILE_EXISTS") {
			fn = s.remoteFileExist
		}
		if !isEnvTrue("DO_NOT_CHECKSUM") && fn(host, dest) {
			rfp, _ := client.Stat(dest)
			if lfp.Size() == rfp.Size() && hash.FileDigest(src) == s.RemoteSha256Sum(host, dest) {
				logger.Debug("remote dst %s already exists and is the latest version, skip copying process", dest)
				return nil
			}
		}
		lf, err := os.Open(filepath.Clean(src))
		if err != nil {
			return err
		}
		defer lf.Close()

		dstfp, err := client.Create(dest)
		if err != nil {
			return err
		}
		if err = dstfp.Chmod(lfp.Mode()); err != nil {
			return fmt.Errorf("failed to Chmod dst: %v", err)
		}
		defer dstfp.Close()
		if _, err = io.Copy(dstfp, lf); err != nil {
			return err
		}
		if !isEnvTrue("DO_NOT_CHECKSUM") {
			sh := hash.FileDigest(src)
			dh := s.RemoteSha256Sum(host, dest)
			if sh != dh {
				return fmt.Errorf("sha256 sum not match %s != %s, maybe network corruption?", sh, dh)
			}
		}
		_ = epu.Add(1)
	}
	return nil
}

func checkIfRemoteFileExists(client *sftp.Client, fp string) (bool, error) {
	_, err := client.Stat(fp)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func isEnvTrue(k string) bool {
	if v, ok := os.LookupEnv(k); ok {
		boolVal, _ := strconv.ParseBool(v)
		return boolVal
	}
	return false
}
