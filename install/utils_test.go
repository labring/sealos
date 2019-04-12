package install

import (
	"bytes"
	"io"
	"io/ioutil"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"
	"testing"
)

func TestCmd(t *testing.T) {
	User = "cuisongliu"
	Passwd = "admin"

	Cmd("127.0.0.1", "ls")
	Cmd("127.0.0.1", "ls")
	Cmd("127.0.0.1", "ls")
	Cmd("127.0.0.1", "ls")

}

func TestTemplate(t *testing.T) {
	var masters = []string{"172.20.241.205", "172.20.241.206", "172.20.241.207"}
	var vip = "10.103.97.1"
	User = "cuisongliu"
	Passwd = "admin"
	Cmd("127.0.0.1", "echo \""+string(Template(masters, vip))+"\" > ~/aa")
	t.Log(string(Template(masters, vip)))
}

func TestLoad(t *testing.T) {
	KubeadmFile = "/home/cuisongliu/aa"
	//LoadMasterAndVIP()
	kubeadmData, _ := ioutil.ReadFile(KubeadmFile)
	reader := bytes.NewReader(kubeadmData)
	ext := runtime.RawExtension{}
	d := yaml.NewYAMLOrJSONDecoder(reader, 4096)
	for {
		if err := d.Decode(&ext); err != nil {
			if err == io.EOF {
				return
			} else {
				t.Error("FAILED")
			}
			return
		}
		t.Log(string(ext.Raw))
	}

}
