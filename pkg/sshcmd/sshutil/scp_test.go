package sshutil

import (
	"github.com/wonderivan/logger"
	"testing"
)

func TestSSHCopyLocalToRemote(t *testing.T) {
	type args struct {
		host       string
		localPath  string
		remotePath string
	}
	var (
		host = "192.168.160.243"
		ssh  = SSH{
			User:       "root",
			Password:   "centos",
			PkFile:     "",
			PkPassword: "",
			Timeout:    nil,
		}
	)
	tests := []struct {
		name   string
		fields SSH
		args   args
	}{
		{"test for copy file to remote server", ssh, args{
			host,
			"/home/louis/temp/01",
			"/data/temp/01",
		}},
		{"test copy for file when local file is not exist", ssh, args{
			host,
			// local file  001 is not exist.
			"/home/louis/temp/001",
			"/data/temp/01",
		}},
		{"test copy dir to remote server", ssh, args{
			host,
			"/home/louis/temp",
			"/data/temp01",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ss := &SSH{
				User:       tt.fields.User,
				Password:   tt.fields.Password,
				PkFile:     tt.fields.PkFile,
				PkPassword: tt.fields.PkPassword,
				Timeout:    tt.fields.Timeout,
			}

			if !fileExist(tt.args.localPath) {
				logger.Error("local filepath is not exit")
				return
			}
			if ss.IsFileExist(host, tt.args.remotePath) {
				logger.Error("remote filepath is exit")
				return
			}
			// test copy dir
			ss.CopyLocalToRemote(tt.args.host, tt.args.localPath, tt.args.remotePath)

			// test the copy result
			ss.Cmd(tt.args.host, "ls -lh "+tt.args.remotePath)

			// rm remote file
			ss.Cmd(tt.args.host, "rm -rf "+tt.args.remotePath)
		})
	}
}
