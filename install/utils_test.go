package install

import (
	"fmt"
	"strconv"
	"strings"
	"testing"
	"time"
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
	install.SendPackage("/home/cuisongliu/Documents/kubernetes-doc/kube1.14.1.tar.gz", true)
}

func TestSendHttps(t *testing.T) {
	User = "root"
	Passwd = "admin"
	install := &SealosInstaller{
		Masters: []string{"172.16.4.2"},
	}
	install.SendPackage("xxx", false)
}

func TestProcess(t *testing.T) {
	for i := 10; i <= 100; i += 10 {
		str := "[" + bar(i/10, 10) + "] " + strconv.Itoa(i) + "%"
		fmt.Printf("\r%s", str)
		time.Sleep(1 * time.Second)
	}
	fmt.Println()

}
func bar(count, size int) string {
	str := ""
	for i := 0; i < size; i++ {
		if i < count {
			str += "="
		} else {
			str += " "
		}
	}
	return str
}
