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

package install

import (
	"encoding/json"
	"fmt"
	"reflect"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/fanux/sealos/pkg/logger"
)

func TestPath(t *testing.T) {
	tt := strings.HasPrefix("ffff/kube1.14.1.tar.gz", "https")
	t.Log(tt)
}

func TestPrint(t *testing.T) {
	//User = "root"
	//Passwd = "admin"
	//Masters = []string{"172.16.4.2"}
	//PkgUrl = "http://172.16.4.1:8080/kube1.14.1.tar.gz"
	install := &SealosInstaller{}
	install.Print("SendPackage", "KubeadmConfigInstall", "InstallMaster0", "JoinMasters", "JoinNodes")
	install.PrintFinish()
}

func TestVersionToInt(t *testing.T) {
	t.Log(ParseIPs([]string{"172.26.13.133-172.26.13.136:2222"}))
	fmt.Println(VersionToInt("v1.15.6"))
	fmt.Println(VersionToInt("v1.18.6-rc.0"))
}

func TestSliceRemoveStr(t *testing.T) {
	ss := []string{"aa", "bb", "cc"}
	aa := SliceRemoveStr(ss, "bb")
	t.Log(aa)
}

func TestParseIPs(t *testing.T) {
	type args struct {
		ips []string
	}
	tests := []struct {
		name string
		args args
		want []string
	}{
		{
			"test multiple ips",
			args{[]string{"192.168.0.2-192.168.0.6"}},
			[]string{"192.168.0.2:22", "192.168.0.3:22", "192.168.0.4:22", "192.168.0.5:22", "192.168.0.6:22"},
		},
		{
			"test multiple ips",
			args{[]string{"192.168.0.2-192.168.0.3", "192.168.0.5-192.168.0.6"}},
			[]string{"192.168.0.2:22", "192.168.0.3:22", "192.168.0.5:22", "192.168.0.6:22"},
		},
		{
			"test multiple ips",
			args{[]string{"192.168.0.2-192.168.0.4", "192.168.0.8"}},
			[]string{"192.168.0.2:22", "192.168.0.3:22", "192.168.0.4:22", "192.168.0.8:22"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ParseIPs(tt.args.ips); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ParseIPs() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDecodeIPs(t *testing.T) {
	type args struct {
		ips []string
	}
	tests := []struct {
		name string
		args args
		want []string
	}{
		{
			"test decode ips",
			args{[]string{"192.168.0.1-192.168.0.3"}},
			[]string{"192.168.0.1:22", "192.168.0.2:22", "192.168.0.3:22"},
		},
		{
			"test decode ips",
			args{[]string{"192.168.0.1", "192.168.0.3:23"}},
			[]string{"192.168.0.1:22", "192.168.0.3:23"},
		},
		{
			"test decode ips",
			args{[]string{"192.168.0.1-192.168.0.3:23", "192.168.0.5"}},
			[]string{"192.168.0.1:23", "192.168.0.2:23", "192.168.0.3:23", "192.168.0.5:22"},
		},
		{
			"test decode ips",
			args{[]string{"192.168.0.1:24", "192.168.0.3"}},
			[]string{"192.168.0.1:24", "192.168.0.3:22"},
		},
		{
			"test decode ips",
			args{[]string{"192.168.0.1-192.168.0.3", "192.168.0.4-192.168.0.6:25", "192.168.0.7:25", "192.168.0.8"}},
			[]string{"192.168.0.1:22", "192.168.0.2:22", "192.168.0.3:22", "192.168.0.4:25", "192.168.0.5:25", "192.168.0.6:25", "192.168.0.7:25", "192.168.0.8:22"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := DecodeIPs(tt.args.ips); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("DecodeIPs() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFileExist(t *testing.T) {
	type args struct {
		path string
	}
	tests := []struct {
		name string
		args args
		want bool
	}{
		{"file exist", args{"utils.go"}, true},
		{"file not exist", args{"/home/louis/.ssh/id_rsa.public"}, false},
		{"PkgFile", args{"/root/kube1.18.0.tar.gz"}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FileExist(tt.args.path); got != tt.want {
				t.Errorf("FileExist() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestVersionToIntAll(t *testing.T) {
	type args struct {
		version string
	}
	tests := []struct {
		name string
		args args
		want int
	}{
		{"test01", args{"v1.19.1"}, 1191},
		{"test02", args{"v1.15.1"}, 1151},
		{"test03", args{"v1.15.13"}, 11513},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := VersionToIntAll(tt.args.version); got != tt.want {
				t.Errorf("VersionToInt() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetMajorMinorInt(t *testing.T) {
	type args struct {
		version string
	}
	tests := []struct {
		name      string
		args      args
		wantMajor int
		wantMinor int
	}{
		{"test01", args{"v1.18.1"}, 118, 1},
		{"test02", args{"v1.15.11"}, 115, 11},
		{"test03", args{"v1.16.14"}, 116, 14},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotMajor, gotMinor := GetMajorMinorInt(tt.args.version)
			if gotMajor != tt.wantMajor {
				t.Errorf("GetMajorMinorInt() gotMajor = %v, want %v", gotMajor, tt.wantMajor)
			}
			if gotMinor != tt.wantMinor {
				t.Errorf("GetMajorMinorInt() gotMinor = %v, want %v", gotMinor, tt.wantMinor)
			}
		})
	}
}

func TestCanUpgradeByNewVersion(t *testing.T) {
	type args struct {
		new string
		old string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{"test01", args{"v1.18.5", "v1.16.14"}, true},
		{"test02", args{"v1.19.3", "v1.18.9"}, false},
		{"test03", args{"v1.15.11", "v1.18.9"}, true},
		{"test03", args{"v1.20.1", "v1.19.6"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := CanUpgradeByNewVersion(tt.args.new, tt.args.old); (err != nil) != tt.wantErr {
				t.Errorf("CanUpgradeByNewVersion() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFor120(t *testing.T) {
	type args struct {
		version string
	}
	tests := []struct {
		name string
		args args
		want bool
	}{
		{"test01", args{"v1.19.2"}, false},
		{"test02", args{"v1.18.2"}, false},
		{"test03", args{"v1.20.2"}, true},
		{"test04", args{"v1.20.0-rc.0"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := For120(tt.args.version); got != tt.want {
				t.Errorf("For120() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_Example(t *testing.T) {
	pool := NewPool(2)
	println(runtime.NumGoroutine())
	for i := 0; i < 10; i++ {
		pool.Add(1)
		go func(n int) {
			time.Sleep(time.Second)
			println(runtime.NumGoroutine(), n)
			pool.Done()
		}(i)
	}
	pool.Wait()
	println(runtime.NumGoroutine())
}

func Test_Cmd(t *testing.T) {
	tmpcmd := "cat /tmp/tmp.json"
	host := "192.168.218.97"
	var cniVersion string
	var metajson string
	var tmpdata metadata

	SSHConfig.User = "louis"
	SSHConfig.Password = "210010"

	metajson = SSHConfig.CmdToString(host, tmpcmd, "")
	err := json.Unmarshal([]byte(metajson), &tmpdata)
	if err != nil {
		logger.Warn("get metadata version err: ", err)
	} else {
		cniVersion = tmpdata.CniVersion
		Network = tmpdata.CniName
	}
	fmt.Println(cniVersion, Network)
}
