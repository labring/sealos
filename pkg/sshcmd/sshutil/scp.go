package sshutil

import (
	"bytes"
	"fmt"
	"github.com/fanux/sealos/pkg/sshcmd/md5sum"
	"github.com/pkg/sftp"
	"github.com/wonderivan/logger"
	"golang.org/x/crypto/ssh"
	"io"
	"net"
	"os"
	"strings"
	"time"
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
		logger.Alert("[ssh][%s]transfer total size is: %.2f%s ;speed is %d%s", host, totalLength, totalUnit, speed, unit)
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
		logger.Alert("[ssh][%s]transfer total size is: %d%s", host, totalMB, "MB")
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
	srcFile.WriteTo(dstFile)
}