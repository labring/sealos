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
	"strings"
	"time"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/progress"
	"github.com/pkg/sftp"
	"github.com/schollz/progressbar/v3"
	"golang.org/x/crypto/ssh"
)

func (c *Client) RemoteSha256Sum(host, remoteFilePath string) string {
	cmd := fmt.Sprintf("sha256sum %s | cut -d\" \" -f1", remoteFilePath)
	remoteHash, err := c.CmdToString(host, cmd, "")
	if err != nil {
		logger.Error("failed to calculate remote sha256 sum %s %s %v", host, remoteFilePath, err)
	}
	return remoteHash
}

func getOnelineResult(output, sep string) string {
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
	var (
		sshClient  *ssh.Client
		sftpClient *sftp.Client
		err        error
	)

	hostsClientMap.Mux.Lock()
	defer hostsClientMap.Mux.Unlock()
	if hc, ok := hostsClientMap.ClientMap[host]; ok {
		return hc.SSHClient, hc.SftpClient, err
	}
	sshClient, err = c.connect(host)
	if err != nil {
		return nil, nil, err
	}
	// create sftp client
	if c.sudo || c.user != defaultUsername {
		sftpClient, err = NewSudoSftpClient(sshClient, c.password)
	} else {
		sftpClient, err = sftp.NewClient(sshClient)
	}

	if err == nil {
		hc := HostClient{
			SSHClient:  sshClient,
			SftpClient: sftpClient,
		}
		hostsClientMap.ClientMap[host] = hc
	}

	return sshClient, sftpClient, err
}

func (c *Client) sftpConnect(host string) (*sftp.Client, error) {
	var (
		sftpClient *sftp.Client
		err        error
	)
	err = exponentialBackOffRetry(defaultMaxRetry, time.Millisecond*100, 2, func() error {
		_, sftpClient, err = c.newClientAndSftpClient(host)
		return err
	}, isErrorWorthRetry)
	return sftpClient, err
}

// Copy is copy file or dir to remotePath, add md5 validate
func (c *Client) Copy(host, localPath, remotePath string) error {
	logger.Debug("remote copy files src %s to dst %s", localPath, remotePath)
	sftpClient, err := c.sftpConnect(host)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}

	f, err := os.Stat(localPath)
	if err != nil {
		return fmt.Errorf("get file stat failed %w", err)
	}

	remoteDir := filepath.Dir(remotePath)
	rfp, err := sftpClient.Stat(remoteDir)
	if err != nil {
		if !os.IsNotExist(err) {
			return err
		}
		if err = sftpClient.MkdirAll(remoteDir); err != nil {
			return fmt.Errorf("failed to Mkdir remote: %w", err)
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

func (c *Client) Fetch(host, src, dst string) error {
	logger.Debug("fetch remote file %s to %s", src, dst)
	sftpClient, err := c.sftpConnect(host)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}

	rfp, err := sftpClient.Open(src)
	if err != nil {
		return fmt.Errorf("failed to open remote file %s: %w", src, err)
	}
	defer func() {
		_ = rfp.Close()
	}()
	switch {
	case file.IsDir(dst):
		dst = filepath.Join(dst, filepath.Base(src))
	case file.IsFile(dst):
		return fmt.Errorf("local file %s already exists", dst)
	default:
		if err := file.MkDirs(filepath.Dir(dst)); err != nil {
			return err
		}
	}

	created, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer created.Close()
	_, err = io.Copy(created, rfp)
	return err
}

func (c *Client) doCopy(
	client *sftp.Client,
	host, src, dest string,
	epu *progressbar.ProgressBar,
) error {
	logger.Debug("copying %s to %s on host %s", src, dest, host)
	lfp, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("failed to Stat local: %w", err)
	}
	if lfp.IsDir() {
		entries, err := os.ReadDir(src)
		if err != nil {
			return fmt.Errorf("failed to ReadDir: %w", err)
		}
		if err = client.MkdirAll(dest); err != nil {
			return fmt.Errorf("failed to Mkdir remote: %w", err)
		}
		for _, entry := range entries {
			if err = c.doCopy(client, host, path.Join(src, entry.Name()), path.Join(dest, entry.Name()), epu); err != nil {
				return err
			}
		}
	} else {
		lf, err := os.Open(filepath.Clean(src))
		if err != nil {
			return fmt.Errorf("failed to open: %w", err)
		}
		defer lf.Close()

		destTmp := dest + ".tmp"
		if err = func(tmpName string) error {
			dstfp, err := client.Create(tmpName)
			if err != nil {
				return fmt.Errorf("failed to create: %w", err)
			}
			defer dstfp.Close()

			if err = dstfp.Chmod(lfp.Mode()); err != nil {
				return fmt.Errorf("failed to Chmod dst: %w", err)
			}
			if _, err = io.Copy(dstfp, lf); err != nil {
				return fmt.Errorf("failed to Copy: %w", err)
			}
			return nil
		}(destTmp); err != nil {
			return err
		}

		if err = client.PosixRename(destTmp, dest); err != nil {
			return fmt.Errorf("failed to rename %s to %s: %w", destTmp, dest, err)
		}

		_ = epu.Add(1)
	}
	return nil
}
