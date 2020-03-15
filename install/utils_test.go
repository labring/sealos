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
	t.Log(ParseIPs([]string{"1.1.1.1-1.1.1.5"}))
}

func TestUrlGetMd5(t *testing.T) {
	aa := UrlGetMd5("https://sealyun.oss-cn-beijing.aliyuncs.com/37374d999dbadb788ef0461844a70151-1.16.0/kube1.16.0.tar.gz")
	t.Log(aa)
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
			[]string{"192.168.0.2","192.168.0.3","192.168.0.4","192.168.0.5","192.168.0.6"},
		},
		{
			"test multiple ips",
			args{[]string{"192.168.0.2-192.168.0.3","192.168.0.5-192.168.0.6"}},
			[]string{"192.168.0.2","192.168.0.3","192.168.0.5","192.168.0.6"},
		},
		{
			"test multiple ips",
			args{[]string{"192.168.0.2-192.168.0.4","192.168.0.8"}},
			[]string{"192.168.0.2","192.168.0.3","192.168.0.4","192.168.0.8"},
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