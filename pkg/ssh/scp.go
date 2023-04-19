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
	"time"

	"github.com/sirupsen/logrus"

	"github.com/labring/sealos/pkg/system"

	"github.com/pkg/sftp"
	"github.com/schollz/progressbar/v3"
	"golang.org/x/crypto/ssh"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/hash"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/progress"
)

func (c *Client) RemoteSha256Sum(host, remoteFilePath string) string {
	cmd := fmt.Sprintf("sha256sum %s | cut -d\" \" -f1", remoteFilePath)
	remoteHash, err := c.CmdToString(host, cmd, "")
	if err != nil {
		logger.Error("failed to calculate remote sha256 sum %s %s %v", host, remoteFilePath, err)
	}
	return remoteHash
}

func getOnelineResult(output string, sep string) string {
	return strings.ReplaceAll(strings.ReplaceAll(output, "\r\n", sep), "\n", sep)
}

// CmdToString execute command on host and replace output with sep to oneline
func (c *Client) CmdToString(host, cmd, sep string) (string, error) {
	logger.Debug("start to exec remote %s shell: %s", host, cmd)
	output, err := c.Cmd(host, cmd)
	data := string(output)
	if err != nil {
		return data, err
	}
	if len(data) == 0 {
		return "", fmt.Errorf("command %s on %s return nil", cmd, host)
	}
	return getOnelineResult(data, sep), nil
}

func (c *Client) newClientAndSftpClient(host string) (*ssh.Client, *sftp.Client, error) {
	sshClient, err := c.connect(host)
	if err != nil {
		return nil, nil, err
	}
	// create sftp client
	sftpClient, err := sftp.NewClient(sshClient)
	return sshClient, sftpClient, err
}

func (c *Client) sftpConnect(host string) (sshClient *ssh.Client, sftpClient *sftp.Client, err error) {
	err = exponentialBackOffRetry(defaultMaxRetry, time.Millisecond*100, 2, func() error {
		sshClient, sftpClient, err = c.newClientAndSftpClient(host)
		return err
	}, isErrorWorthRetry)
	return
}

// Copy is copy file or dir to remotePath, add md5 validate
func (c *Client) Copy(host, localPath, remotePath string) error {
	if c.isLocalAction(host) {
		logger.Debug("local %s copy files src %s to dst %s", host, localPath, remotePath)
		return file.RecursionCopy(localPath, remotePath)
	}
	logger.Debug("remote copy files src %s to dst %s", localPath, remotePath)
	sshClient, sftpClient, err := c.sftpConnect(host)
	if err != nil {
		return fmt.Errorf("failed to connect: %s", err)
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
			return fmt.Errorf("failed to Mkdir remote: %v", err)
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
	bar := progress.Simple("copying files to "+host, number)
	defer func() {
		_ = bar.Close()
	}()

	return c.doCopy(sftpClient, host, localPath, remotePath, bar)
}

func (c *Client) CopyR(host, localPath, remotePath string) error {
	if c.isLocalAction(host) {
		logger.Debug("local %s copy files src %s to dst %s", host, remotePath, localPath)
		return file.RecursionCopy(remotePath, localPath)
	}
	logger.Debug("remote fetch files src %s to dst %s", remotePath, localPath)
	sshClient, sftpClient, err := c.sftpConnect(host)
	if err != nil {
		return fmt.Errorf("failed to connect: %s", err)
	}
	defer func() {
		_ = sftpClient.Close()
		_ = sshClient.Close()
	}()

	srcFile, err := sftpClient.Open(remotePath)
	if err != nil {
		return fmt.Errorf("failed to open remote file %s: %v", remotePath, err)
	}
	defer func() {
		if err := srcFile.Close(); err != nil {
			logger.Error("failed to close file: %v", err)
		}
	}()
	if file.IsDir(localPath) {
		localPath = filepath.Join(localPath, filepath.Base(remotePath))
	} else if file.IsFile(localPath) {
		return fmt.Errorf("local file %s already exist", localPath)
	} else {
		if err := file.MkDirs(filepath.Dir(localPath)); err != nil {
			return err
		}
	}
	dstFile, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %v", err)
	}
	defer func() {
		if err := dstFile.Close(); err != nil {
			logrus.Errorf("failed to close file: %v", err)
		}
	}()
	_, err = srcFile.WriteTo(dstFile)
	return err
}

func (c *Client) doCopy(client *sftp.Client, host, src, dest string, epu *progressbar.ProgressBar) error {
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
			if err = c.doCopy(client, host, path.Join(src, entry.Name()), path.Join(dest, entry.Name()), epu); err != nil {
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
		if isCheckFileMD5() && fn(host, dest) {
			rfp, _ := client.Stat(dest)
			if lfp.Size() == rfp.Size() && hash.FileDigest(src) == c.RemoteSha256Sum(host, dest) {
				logger.Debug("remote dst %s already exists and is the latest version, skip copying process", dest)
				return nil
			}
		}
		lf, err := os.Open(filepath.Clean(src))
		if err != nil {
			return fmt.Errorf("failed to open: %v", err)
		}
		defer lf.Close()

		dstfp, err := client.Create(dest)
		if err != nil {
			return fmt.Errorf("failed to create: %v", err)
		}
		if err = dstfp.Chmod(lfp.Mode()); err != nil {
			return fmt.Errorf("failed to Chmod dst: %v", err)
		}
		defer dstfp.Close()
		if _, err = io.Copy(dstfp, lf); err != nil {
			return fmt.Errorf("failed to Copy: %v", err)
		}
		if isCheckFileMD5() {
			dh := c.RemoteSha256Sum(host, dest)
			if dh == "" {
				// when ssh connection failed, remote sha256 is default to "", so ignore it.
				return nil
			}
			sh := hash.FileDigest(src)
			if sh != dh {
				return fmt.Errorf("sha256 sum not match %s(%s) != %s(%s), maybe network corruption?", src, sh, dest, dh)
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

func isCheckFileMD5() bool {
	if v, err := system.Get(system.ScpCheckSumConfigKey); err == nil {
		boolVal, _ := strconv.ParseBool(v)
		return boolVal
	}
	return true
}
