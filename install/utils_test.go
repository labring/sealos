package install

import (
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
	t.Log(VersionToInt("v1.15.6"))
}
