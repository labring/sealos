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
	"net"
	"testing"
)

func TestSSH_Cmd(t *testing.T) {
	type args struct {
		ssh       SSH
		host, cmd string
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "touch test.txt",
			args: args{
				ssh: SSH{
					false,
					"root",
					"huaijiahui.com",
					"",
					"",
					"",
					0,
					&[]net.Addr{},
					nil,
				},
				host: "192.168.56.103",
				cmd:  "bash /opt/touchTxt.sh",
			},
			want:    "success touch test.txt\r\n", //命令返回值后缀为/r/n
			wantErr: false,
		},
		{
			name: "ls /opt/test",
			args: args{
				ssh: SSH{
					false,
					"root",
					"huaijiahui.com",
					"",
					"",
					"",
					0,
					&[]net.Addr{},
					nil,
				},
				host: "192.168.56.103",
				cmd:  "ls /opt/test",
			},
			want:    "test.txt\r\n",
			wantErr: false,
		},
		{
			name: "remove test.txt",
			args: args{
				ssh: SSH{
					true,
					"root",
					"huaijiahui.com",
					"",
					"",
					"",
					0,
					&[]net.Addr{},
					nil,
				},
				host: "192.168.56.103",
				cmd:  "bash /opt/removeTxt.sh",
			},
			want:    "test remove success\r\n",
			wantErr: false,
		},
		{
			name: "exist 1",
			args: args{
				ssh: SSH{
					true,
					"root",
					"huaijiahui.com",
					"",
					"",
					"",
					0,
					&[]net.Addr{},
					nil,
				},
				host: "192.168.56.103",
				cmd:  "bash /opt/exit1.sh",
			},
			want:    "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.args.ssh.Cmd(tt.args.host, tt.args.cmd)
			if (err != nil) != tt.wantErr {
				t.Errorf("Cmd err : %v,  wangErr is %v", err, tt.wantErr)
			}

			if string(got) != tt.want {
				t.Errorf("got={%s},want={%s}", string(got), tt.want)
			}
		})
	}
}

func TestSSH_CmdAsync(t *testing.T) {
	type args struct {
		ssh       SSH
		host, cmd string
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "touch test.txt",
			args: args{
				ssh: SSH{
					true,
					"root",
					"huaijiahui.com",
					"",
					"",
					"",
					0,
					&[]net.Addr{},
					nil,
				},
				host: "192.168.56.103",
				cmd:  "bash /opt/touchTxt.sh",
			},
			wantErr: false,
		},
		{
			name: "ls /root",
			args: args{
				ssh: SSH{
					true,
					"root",
					"",
					"",
					"",
					"",
					0,
					&[]net.Addr{},
					nil,
				},
				host: "192.168.5.58:2822",
				cmd:  "ls /root",
			},
			wantErr: false,
		},
		{
			name: "remove test.txt",
			args: args{
				ssh: SSH{
					true,
					"root",
					"huaijiahui.com",
					"",
					"",
					"",
					0,
					&[]net.Addr{},
					nil,
				},
				host: "192.168.56.103",
				cmd:  "bash /opt/removeTxt.sh",
			},
			wantErr: false,
		},
		{
			name: "exist 1",
			args: args{
				ssh: SSH{
					true,
					"root",
					"huaijiahui.com",
					"",
					"",
					"",
					0,
					&[]net.Addr{},
					nil,
				},
				host: "192.168.56.103",
				cmd:  "bash /opt/exit1.sh",
			},
			wantErr: true, //Process exited with status 1
		},
		{
			name: "exist 1",
			args: args{
				ssh: SSH{
					true,
					"root",
					"",
					"/Users/cuisongliu/.ssh/realai",
					"",
					"",
					0,
					&[]net.Addr{},
					nil,
				},
				host: "192.168.5.58:2822",
				cmd:  "ls /root",
			},
			wantErr: true, //Process exited with status 1
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.args.ssh.CmdAsync(tt.args.host, tt.args.cmd); (err != nil) != tt.wantErr {
				t.Errorf("Cmd err : %v,  wangErr is %v", err, tt.wantErr)
			}
		})
	}
}
