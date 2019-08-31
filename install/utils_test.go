package install

import (
	"strings"
	"testing"
)

func TestCmd(t *testing.T) {
	User = "cuisongliu"
	Passwd = "admin"
	install := &SealosInstaller{
		Masters: []string{"127.0.0.3"},
		PkgUrl:  "http://172.16.4.1:8080/kube1.14.1.tar.gz",
	}
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
	install := &SealosInstaller{
		Masters: []string{"172.16.4.2"},
		PkgUrl:  "/home/cuisongliu/Documents/kubernetes-doc/kube1.14.1.tar.gz",
	}
	install.SendPackage()
}

func TestSendHttps(t *testing.T) {
	User = "root"
	Passwd = "admin"
	install := &SealosInstaller{
		Masters: []string{"172.16.4.2"},
		PkgUrl:  "http://172.16.4.1:8080/kube1.14.1.tar.gz",
	}
	install.SendPackage()
}

func TestProcess(t *testing.T) {
	//fmt.Printf("%s \033[K\n", "--") // 输出一行结果
	//fmt.Printf("\033[%dA\033[K", 1) // 将光标向上移动一行
	//fmt.Printf("%s \033[K\n", "=-") // 输出第二行结果
	//bar(100, 1, 0)
}

func TestPrint(t *testing.T) {
	User = "root"
	Passwd = "admin"
	install := &SealosInstaller{
		Masters: []string{"172.16.4.2"},
		PkgUrl:  "http://172.16.4.1:8080/kube1.14.1.tar.gz",
	}
	install.Print("SendPackage", "KubeadmConfigInstall", "InstallMaster0", "JoinMasters", "JoinNodes")
}

func TestGetFileSize(t *testing.T) {
	GetFileSize("httfp://www.affa.com")
}
