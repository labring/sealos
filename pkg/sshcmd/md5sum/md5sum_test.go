package md5sum

import "testing"

func TestFromLocal(t *testing.T) {
	ss := FromLocal("/Users/cuisongliu/Downloads/kube1.17.4.tar.gz")
	println(ss)
}
