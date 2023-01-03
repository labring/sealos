package e2e

import (
	"log"
	"strconv"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/infra/testdata/api"

	baseapi "github.com/labring/sealos/test/testdata/api"
)

const (
	TestNamespace = "ns-infra-test"
	InfraName     = "infra-test"
)

func TestInfra(t *testing.T) {
	cnt := 0
	baseapi.EnsureNamespace(TestNamespace)
	time.Sleep(time.Second * 3)
	for flag := true; flag == true; {
		testname := "test" + strconv.Itoa(cnt)

		t.Run(testname, func(t *testing.T) {
			t.Logf("start test %v", cnt)

			t.Log("create infra and wait for infra to run")
			if err := api.CreateInfra(TestNamespace, InfraName); err != nil {
				flag = false
				t.Fatalf("create infra failed: %v", err)
			}

			if err := api.WaitInfraRunning(TestNamespace, InfraName, 100); err != nil {
				flag = false
				t.Fatalf("infra failed to run: %v", err)
			}
			t.Log("infra succeeded to run")

			t.Log("create cluster and wait for cluster to run")
			if err := api.CreateCluster(TestNamespace, InfraName); err != nil {
				flag = false
				t.Fatalf("create cluster failed: %v", err)
			}

			if err := api.WaitClusterRunning(TestNamespace, InfraName, 30); err != nil {
				flag = false
				t.Fatalf("cluster failed to run: %v", err)
			}
			t.Log("cluster succeeded to run")

			t.Cleanup(clean)
			cnt++
		})
	}
	t.Cleanup(cleanAll)
}

func clean() {
	if err := api.DeleteCluster(TestNamespace, InfraName); err != nil {
		log.Println(err)
	}

	if err := api.DeleteInfra(TestNamespace, InfraName); err != nil {
		log.Println(err)
	}
}

func cleanAll() {
	if err := baseapi.DeleteNamespace(TestNamespace); err != nil {
		log.Println(err)
	}
}
