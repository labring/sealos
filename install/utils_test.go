package install

import (
	"fmt"
	"strings"
	"testing"

	"github.com/wonderivan/logger"
)

func TestCmd(t *testing.T) {
	User = "cuisongliu"
	Passwd = "admin"

	Cmd("127.0.0.1", "ls")

}
func TestCopy(t *testing.T) {
	User = "cuisongliu"
	Passwd = "admin"

	Copy("127.0.0.1", "/home/cuisongliu/aa", "/home/cuisongliu/aa")

}

func TestTemplate(t *testing.T) {
	var masters = []string{"172.20.241.205", "172.20.241.206", "172.20.241.207"}
	var vip = "10.103.97.1"
	User = "cuisongliu"
	Passwd = "admin"
	Cmd("127.0.0.1", "echo \""+string(Template(masters, vip, "v1.14.1"))+"\" > ~/aa")
	t.Log(string(Template(masters, vip, "v1.14.0")))
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
	}
	install.SendPackage("/home/cuisongliu/Documents/kubernetes-doc/kube1.14.1.tar.gz")
}

func TestSendHttps(t *testing.T) {
	User = "root"
	Passwd = "admin"
	install := &SealosInstaller{
		Masters: []string{"172.16.4.2"},
	}
	install.SendPackage("http://172.16.4.1:8080/kube1.14.1.tar.gz")
}

func TestProcess(t *testing.T) {
	//fmt.Printf("%s \033[K\n", "--") // 输出一行结果
	//fmt.Printf("\033[%dA\033[K", 1) // 将光标向上移动一行
	//fmt.Printf("%s \033[K\n", "=-") // 输出第二行结果
	bar(100, 1, 0)
}
func bar(count, current, num int) int {
	reslt := current / count * 100
	str := fmt.Sprintf("%d%% []", reslt)
	logger.Debug(str)
	return reslt
}

func TestHostAndPortSpilt(t *testing.T) {
	hosts := []string{"10.0.6.111:2233", "10.0.6.112:223", "10.0.6.113", "10.0.6.114"}
	got, got1 := HostAndPortSpilt(hosts)
	t.Log(got)
	t.Log(got1)
	t.Log("Next........")
	got, got1 = HostAndPortSpilt("192.211.3.1:8888")
	t.Log(got)
	t.Log(got1)
}
