package install

import (
	"reflect"
	"strings"
	"testing"
)

func TestPath(t *testing.T) {
	tt := strings.HasPrefix("ffff/kube1.14.1.tar.gz", "https")
	t.Log(tt)
}

func TestProcess(t *testing.T) {
	//fmt.Printf("%s \033[K\n", "--") // 输出一行结果
	//fmt.Printf("\033[%dA\033[K", 1) // 将光标向上移动一行
	//fmt.Printf("%s \033[K\n", "=-") // 输出第二行结果
	//bar(100, 1, 0)
}

func TestNotReadyNode(t *testing.T) {
	SSHConfig.User = "root"
	SSHConfig.Password = "PaaS@123"
	ss := isHostName("172.27.139.74", "172.27.139.126")
	print(ss)
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
			[]string{"192.168.0.2", "192.168.0.3", "192.168.0.4", "192.168.0.5", "192.168.0.6"},
		},
		{
			"test multiple ips",
			args{[]string{"192.168.0.2-192.168.0.3", "192.168.0.5-192.168.0.6"}},
			[]string{"192.168.0.2", "192.168.0.3", "192.168.0.5", "192.168.0.6"},
		},
		{
			"test multiple ips",
			args{[]string{"192.168.0.2-192.168.0.4", "192.168.0.8"}},
			[]string{"192.168.0.2", "192.168.0.3", "192.168.0.4", "192.168.0.8"},
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
		{"file exist", args{"/home/louis/.ssh/id_rsa"}, true},
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
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := CanUpgradeByNewVersion(tt.args.new, tt.args.old); (err != nil) != tt.wantErr {
				t.Errorf("CanUpgradeByNewVersion() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}