package install

import "testing"

func Test_generatorKubeadmConfig(t *testing.T) {
	kubeadmConfig()
}

func TestTemplate(t *testing.T) {
	var masters = []string{"172.20.241.205", "172.20.241.206", "172.20.241.207"}
	var vip = "10.103.97.1"
	User = "cuisongliu"
	Passwd = "admin"
	Cmd("127.0.0.1", "echo \""+string(Template(masters, vip, "v1.14.1"))+"\" > ~/aa")
	t.Log(string(Template(masters, vip, "v1.14.0")))
}
