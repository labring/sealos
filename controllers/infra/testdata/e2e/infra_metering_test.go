// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package e2e

import (
	"fmt"
	"log"
	"testing"
	"time"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	v1 "k8s.io/api/core/v1"

	"github.com/labring/sealos/controllers/infra/common"
	"github.com/labring/sealos/controllers/infra/controllers"

	meteringcommonv1 "github.com/labring/sealos/controllers/common/metering/api/v1"
	"github.com/labring/sealos/controllers/infra/testdata/api"

	baseapi "github.com/labring/sealos/test/testdata/api"
)

func TestInfraMetering(t *testing.T) {
	baseapi.EnsureNamespace(TestNamespace)
	t.Run("infra controller test", func(t *testing.T) {
		time.Sleep(5 * time.Second)
		baseapi.EnsureNamespace(TestNamespace)
		baseapi.EnsureNamespace(InfraSystemNamespace)
		t.Log("create infra and wait it to run")
		if err := api.CreateInfra(TestNamespace, InfraName); err != nil {
			t.Fatalf("create infra failed: %v", err)
		}

		if err := api.WaitInfraRunning(TestNamespace, InfraName, 100); err != nil {
			t.Fatalf("infra failed to run: %v", err)
		}
		t.Log("infra succeeded to run")

		t.Log("sync resource")
		if err := api.SyncResource(InfraSystemNamespace, InfraResourceName); err != nil {
			t.Fatalf("failed to sync resource: %v", err)
		}

		time.Sleep(5 * time.Second)
		t.Log("ensure extension resource is created")
		_, err := api.GetExtensionResourcePrice(InfraSystemNamespace, meteringcommonv1.GetExtensionResourcePriceName(infrav1.InfraResourcePricePrefix))
		if err != nil {
			t.Fatalf("failed to get extension resource: %v", err)
		}

		t.Log("ensure resource CR is created")
		infra, _ := api.GetInfra(TestNamespace, InfraName)
		resource, err := api.EnsureResourceCreate(InfraSystemNamespace, controllers.GetResourceName(infra, 1), 90)
		if err != nil {
			resource, err = api.EnsureResourceCreate(InfraSystemNamespace, controllers.GetResourceName(infra, 2), 90)
			if err != nil {
				t.Fatalf(err.Error())
			}
		}
		//check used resource
		if err = checkResourceUsed(resource, common.CPUResourceName); err != nil {
			t.Fatalf(err.Error())
		}
		if err = checkResourceUsed(resource, common.MemoryResourceName); err != nil {
			t.Fatalf(err.Error())
		}
		if err = checkResourceUsed(resource, common.VolumeResourceName); err != nil {
			t.Fatalf(err.Error())
		}
		t.Log(resource)
	})
	t.Cleanup(cleanInfraMetering)
}

func checkResourceUsed(resource *meteringcommonv1.Resource, resourceName v1.ResourceName) error {
	if _, ok := resource.Spec.Resources[resourceName]; !ok {
		return fmt.Errorf("%s resource not found", resourceName)
	}
	if resource.Spec.Resources[resourceName].Used.Value() != 0 {
		fmt.Printf("resource %s has been used %v\n", resourceName, resource.Spec.Resources[resourceName].Used.Value())
	}
	return nil
}

func cleanInfraMetering() {
	fmt.Println("clean infra metering")
	//execout, err := baseapi.Exec("kubectl get resource -A -oyaml")
	//log.Println(execout)
	//if err != nil {
	//	log.Println(err)
	//}

	if err := api.DeleteInfra(TestNamespace, InfraName); err != nil {
		log.Println(err)
	}

	if err := api.DeleteResource(InfraSystemNamespace, InfraResourceName); err != nil {
		log.Println(err)
	}

	if err := baseapi.DeleteNamespace(TestNamespace); err != nil {
		log.Println(err)
	}
}
