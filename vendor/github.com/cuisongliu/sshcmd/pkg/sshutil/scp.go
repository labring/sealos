package sshutil

import (
	"fmt"
	"github.com/cuisongliu/sshcmd/pkg/md5sum"
	"github.com/pkg/sftp"
	"github.com/wonderivan/logger"
	"golang.org/x/crypto/ssh"
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
	logger.Debug("source file md5 value is %s", md5)
	ss.Copy(host, localFilePath, remoteFilePath)
	remoteMD5 := ss.Md5Sum(host, remoteFilePath)
	logger.Debug("host: %s , remote md5: %s", host, remoteMD5)
	remoteMD5 = strings.TrimSpace(remoteMD5)
	md5 = strings.TrimSpace(md5)
	if remoteMD5 == md5 {
		logger.Info("md5 validate true")
		return true
	}
	logger.Error("md5 validate false")
	return false
}
func (ss *SSH) Md5Sum(host, remoteFilePath string) string {
	cmd := fmt.Sprintf("md5sum %s | cut -d\" \" -f1", remoteFilePath)
	remoteMD5 := ss.CmdToString(host, cmd)
	return remoteMD5
}

//Copy is
func (ss *SSH) Copy(host, localFilePath, remoteFilePath string) {
	sftpClient, err := ss.sftpConnect(host)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer sftpClient.Close()
	srcFile, err := os.Open(localFilePath)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer srcFile.Close()

	dstFile, err := sftpClient.Create(remoteFilePath)
	defer func() {
		if r := recover(); r != nil {
			logger.Error("[%s]scpCopy: %s", host, err)
		}
	}()
	if err != nil {
		panic(1)
	}
	defer dstFile.Close()
	buf := make([]byte, 100*oneMBByte) //100mb
	totalMB := 0
	for {
		n, _ := srcFile.Read(buf)
		if n == 0 {
			break
		}
		length, _ := dstFile.Write(buf[0:n])
		totalMB += length / oneMBByte
		logger.Alert("[%s]transfer total size is: %d%s", host, totalMB, "MB")
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
	auth = make([]ssh.AuthMethod, 0)
	auth = append(auth, ss.sshAuthMethod(ss.Password, ss.PkFile))

	clientConfig = &ssh.ClientConfig{
		User:    ss.User,
		Auth:    auth,
		Timeout: 30 * time.Second,
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			return nil
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
