package v1

import (
	"k8s.io/api/networking/v1"
	"testing"
)

func TestIcpValidator_Query(t *testing.T) {
	icpValidator := NewIcpValidator(true, "http://v.juhe.cn/siteTools/app/NewDomain/query.php", "")
	for i := 0; i <= 3; i++ {
		rule := &v1.IngressRule{
			Host: "sealos.cn",
		}
		icpResponse, err := icpValidator.Query(rule)
		if err != nil {
			t.Fatalf("Error querying ICP: %v", err)
		}
		t.Logf("ICP Response: %+v", icpResponse)
	}
}
