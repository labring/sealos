package install

import (
	"strings"
	"testing"
)

func TestCmd(t *testing.T) {
	User = "cuisongliu"
	Passwd = "admin"
	Masters = []string{"127.0.0.3"}
	PkgUrl = "http://172.16.4.1:8080/kube1.14.1.tar.gz"
	install := &SealosInstaller{}
	install.CheckValid()
}
func TestCopy(t *testing.T) {
	User = "cuisongliu"
	Passwd = "admin"

	Copy("127.0.0.1", "/home/cuisongliu/aa", "/home/cuisongliu/aa")

}

func TestRemoteFilExist(t *testing.T) {
	User = "cuisongliu"
	Passwd = "admin"

	RemoteFilExist("127.0.0.1", "/home/cuisongliu/aa")
}

func TestPath(t *testing.T) {
	tt := strings.HasPrefix("ffff/kube1.14.1.tar.gz", "https")
	t.Log(tt)
}

func TestSend(t *testing.T) {
	User = "root"
	Passwd = "admin"
	Masters = []string{"172.16.4.2"}
	PkgUrl = "/home/cuisongliu/Documents/kubernetes-doc/kube1.14.1.tar.gz"
	install := &SealosInstaller{}
	install.SendPackage("kube")
}

func TestSendHttps(t *testing.T) {
	User = "root"
	Passwd = "admin"
	Masters = []string{"172.16.4.2"}
	PkgUrl = "http://172.16.4.1:8080/kube1.14.1.tar.gz"
	install := &SealosInstaller{}
	install.SendPackage("kube")
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

func TestGetFileSize(t *testing.T) {
	GetFileSize("httfp://www.affa.com")
}

func TestVersionToInt(t *testing.T) {
	t.Log(VersionToInt("v1.15.6"))
}

func TestHome(t *testing.T) {
	tests := []struct {
		name    string
		want    string
		wantErr bool
	}{
		{
			name: "test get home dir",
			want: "/Users/fanux",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Home()
			if (err != nil) != tt.wantErr {
				t.Errorf("Home() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("Home() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_homeUnix(t *testing.T) {
	tests := []struct {
		name    string
		want    string
		wantErr bool
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := homeUnix()
			if (err != nil) != tt.wantErr {
				t.Errorf("homeUnix() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("homeUnix() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_homeWindows(t *testing.T) {
	tests := []struct {
		name    string
		want    string
		wantErr bool
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := homeWindows()
			if (err != nil) != tt.wantErr {
				t.Errorf("homeWindows() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("homeWindows() = %v, want %v", got, tt.want)
			}
		})
	}
}
