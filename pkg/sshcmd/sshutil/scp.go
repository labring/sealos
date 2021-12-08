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

package sshutil

import (
	"bytes"
	"fmt"
	"io"
	"io/ioutil"
	"net"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/fanux/sealos/pkg/logger"
	"github.com/fanux/sealos/pkg/sshcmd/md5sum"
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

//Copy is
func (ss *SSH) CopyForMD5(host, localFilePath, remoteFilePath, md5 string) bool {
	//如果有md5则可以验证
	//如果没有md5则拿到本地数据后验证
	if md5 == "" {
		md5 = md5sum.FromLocal(localFilePath)
	}
	logger.Debug("[ssh]source file md5 value is %s", md5)
	ss.Copy(host, localFilePath, remoteFilePath)
	remoteMD5 := ss.Md5Sum(host, remoteFilePath)
	logger.Debug("[ssh]host: %s , remote md5: %s", host, remoteMD5)
	remoteMD5 = strings.TrimSpace(remoteMD5)
	md5 = strings.TrimSpace(md5)
	if remoteMD5 == md5 {
		logger.Info("[ssh]md5 validate true")
		return true
	}
	logger.Error("[ssh]md5 validate false")
	return false
}

func (ss *SSH) Md5Sum(host, remoteFilePath string) string {
	cmd := fmt.Sprintf("md5sum %s | cut -d\" \" -f1", remoteFilePath)
	remoteMD5 := ss.CmdToString(host, cmd, "")
	return remoteMD5
}

//Copy is
func (ss *SSH) Copy(host, localFilePath, remoteFilePath string) {
	sftpClient, err := ss.sftpConnect(host)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer sftpClient.Close()
	srcFile, err := os.Open(localFilePath)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer srcFile.Close()

	dstFile, err := sftpClient.Create(remoteFilePath)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer dstFile.Close()
	buf := make([]byte, 100*oneMBByte) //100mb
	total := 0
	unit := ""
	for {
		n, _ := srcFile.Read(buf)
		if n == 0 {
			break
		}
		length, _ := dstFile.Write(buf[0:n])
		isKb := length/oneMBByte < 1
		speed := 0
		if isKb {
			total += length
			unit = "KB"
			speed = length / oneKBByte
		} else {
			total += length
			unit = "MB"
			speed = length / oneMBByte
		}
		totalLength, totalUnit := toSizeFromInt(total)
		logger.Info("[ssh][%s]transfer total size is: %.2f%s ;speed is %d%s", host, totalLength, totalUnit, speed, unit)
	}
}

//Copy is
func (ss *SSH) CopyConfigFile(host, remoteFilePath string, localFilePathOrBytes interface{}) {
	var (
		data io.Reader
	)
	sftpClient, err := ss.sftpConnect(host)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer sftpClient.Close()

	switch v := localFilePathOrBytes.(type) {
	case string:
		srcFile, err := os.Open(v)
		defer func() {
			if r := recover(); r != nil {
				logger.Error("[ssh][%s]scpCopy: %s", host, err)
			}
		}()
		if err != nil {
			panic(1)
		}
		defer srcFile.Close()
		data = srcFile
	case []byte:
		data = bytes.NewReader(v)
	default:
		panic("must use path or []bytes")
	}

	dstFile, err := sftpClient.Create(remoteFilePath)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer dstFile.Close()
	buf := make([]byte, 100*oneMBByte) //100mb
	totalMB := 0
	for {
		n, _ := data.Read(buf)
		if n == 0 {
			break
		}
		length, _ := dstFile.Write(buf[0:n])
		totalMB += length / oneMBByte
		logger.Info("[ssh][%s]transfer total size is: %d%s", host, totalMB, "MB")
	}
}

//SftpConnect  is
func (ss *SSH) sftpConnect(host string) (*sftp.Client, error) {
	var (
		auth         []ssh.AuthMethod
		addr         string
		clientConfig *ssh.ClientConfig
		sshClient    *ssh.Client
		sftpClient   *sftp.Client
		err          error
	)
	// get auth method
	auth = ss.sshAuthMethod(ss.Password, ss.PkFile, ss.PkPassword)

	clientConfig = &ssh.ClientConfig{
		User:    ss.User,
		Auth:    auth,
		Timeout: 30 * time.Second,
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			return nil
		},
		Config: ssh.Config{
			Ciphers: []string{"aes128-ctr", "aes192-ctr", "aes256-ctr", "aes128-gcm@openssh.com", "arcfour256", "arcfour128", "aes128-cbc", "3des-cbc", "aes192-cbc", "aes256-cbc"},
		},
	}

	// connet to ssh
	addr = ss.addrReformat(host)

	if sshClient, err = ssh.Dial("tcp", addr, clientConfig); err != nil {
		return nil, err
	}

	// create sftp client
	if sftpClient, err = sftp.NewClient(sshClient); err != nil {
		return nil, err
	}

	return sftpClient, nil
}

// CopyRemoteFileToLocal is scp remote file to local
func (ss *SSH) CopyRemoteFileToLocal(host, localFilePath, remoteFilePath string) {
	sftpClient, err := ss.sftpConnect(host)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer sftpClient.Close()
	// open remote source file
	srcFile, err := sftpClient.Open(remoteFilePath)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer srcFile.Close()

	// open local Destination file
	dstFile, err := os.Create(localFilePath)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer dstFile.Close()
	// copy to local file
	_, _ = srcFile.WriteTo(dstFile)
}

// CopyLocalToRemote is copy file or dir to remotePath, add md5 validate
func (ss *SSH) CopyLocalToRemote(host, localPath, remotePath string) {
	sftpClient, err := ss.sftpConnect(host)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]sshConnect err: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	sshClient, err := ss.connect(host)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh][%s]scpConnect err: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer sftpClient.Close()
	defer sshClient.Close()
	s, _ := os.Stat(localPath)
	if s.IsDir() {
		ss.copyLocalDirToRemote(host, sshClient, sftpClient, localPath, remotePath)
	} else {
		baseRemoteFilePath := filepath.Dir(remotePath)
		mkDstDir := fmt.Sprintf("mkdir -p %s || true", baseRemoteFilePath)
		_ = ss.CmdAsync(host, mkDstDir)
		ss.copyLocalFileToRemote(host, sshClient, sftpClient, localPath, remotePath)
	}
}

// ssh session is a problem, 复用ssh链接
func (ss *SSH) copyLocalDirToRemote(host string, sshClient *ssh.Client, sftpClient *sftp.Client, localPath, remotePath string) {
	localFiles, err := ioutil.ReadDir(localPath)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("readDir err : %s", err)
		}
	}()
	if err != nil {
		panic(1)
	}
	_ = sftpClient.Mkdir(remotePath)
	for _, file := range localFiles {
		lfp := path.Join(localPath, file.Name())
		rfp := path.Join(remotePath, file.Name())
		if file.IsDir() {
			_ = sftpClient.Mkdir(rfp)
			ss.copyLocalDirToRemote(host, sshClient, sftpClient, lfp, rfp)
		} else {
			ss.copyLocalFileToRemote(host, sshClient, sftpClient, lfp, rfp)
		}
	}
}

// solve the session
func (ss *SSH) copyLocalFileToRemote(host string, sshClient *ssh.Client, sftpClient *sftp.Client, localPath, remotePath string) {
	srcFile, err := os.Open(localPath)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("open file [%s] err : %s", localPath, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer srcFile.Close()
	dstFile, err := sftpClient.Create(remotePath)
	if err != nil {
		logger.Error("err:", err)
	}
	defer dstFile.Close()
	buf := make([]byte, 100*oneMBByte) //100mb
	total := 0
	unit := ""
	for {
		n, _ := srcFile.Read(buf)
		if n == 0 {
			break
		}
		length, _ := dstFile.Write(buf[0:n])
		isKb := length/oneMBByte < 1
		speed := 0
		if isKb {
			total += length
			unit = "KB"
			speed = length / oneKBByte
		} else {
			total += length
			unit = "MB"
			speed = length / oneMBByte
		}
		totalLength, totalUnit := toSizeFromInt(total)
		logger.Debug("[ssh][%s]transfer local [%s] to Dst [%s] total size is: %.2f%s ;speed is %d%s", host, localPath, remotePath, totalLength, totalUnit, speed, unit)
	}
	if !ss.isCopyMd5Success(sshClient, localPath, remotePath) {
		//	logger.Debug("[ssh][%s] copy local file: %s to remote file: %s validate md5sum success", host, localPath, remotePath)
		//} else {
		logger.Error("[ssh][%s] copy local file: %s to remote file: %s validate md5sum failed", host, localPath, remotePath)
	}
}

func (ss *SSH) isCopyMd5Success(sshClient *ssh.Client, localFile, remoteFile string) bool {
	cmd := fmt.Sprintf("md5sum %s | cut -d\" \" -f1", remoteFile)
	localMd5 := md5sum.FromLocal(localFile)
	sshSession, err := sshClient.NewSession()
	if err != nil {
		return false
	}
	modes := ssh.TerminalModes{
		ssh.ECHO:          0,     // disable echoing
		ssh.TTY_OP_ISPEED: 14400, // input speed = 14.4kbaud
		ssh.TTY_OP_OSPEED: 14400, // output speed = 14.4kbaud
	}

	if err := sshSession.RequestPty("xterm", 80, 40, modes); err != nil {
		return false
	}

	if sshSession.Stdout != nil {
		sshSession.Stdout = nil
		sshSession.Stderr = nil
	}
	b, err := sshSession.CombinedOutput(cmd)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[ssh]Error exec command failed: %s", err)
		}
	}()
	if err != nil {
		panic(1)
	}
	var remoteMd5 string
	if b != nil {
		remoteMd5 = string(b)
		remoteMd5 = strings.ReplaceAll(remoteMd5, "\r\n", "")
	}
	return localMd5 == remoteMd5
}

func (ss *SSH) ValidateMd5sumLocalWithRemote(host, localFile, remoteFile string) bool {
	localMd5 := md5sum.FromLocal(localFile)
	return localMd5 == ss.Md5Sum(host, remoteFile)
}
