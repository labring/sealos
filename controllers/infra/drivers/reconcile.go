package drivers

import (
	"fmt"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/common"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/strings"
)

type Applier struct {
	currentHosts []v1.Hosts
}

func (a *Applier) ReconcileInstance(infra *v1.Infra, driver Driver) (*v2.Cluster, error) {
	if len(infra.Spec.Hosts) == 0 {
		logger.Debug("desired host len is 0")
		return nil, nil
	}

	if !infra.DeletionTimestamp.IsZero() {
		logger.Debug("remove all hosts")
		// TODO driver.RemoveInfra(infra *v1.Infra, driver Driver)
	}

	// get current hosts
	tag := infra.GetInstancesTag()
	var err error
	a.currentHosts, err = driver.GetInstancesByLabel(common.InfraInstancesLabel, tag)
	if err != nil {
		return nil, fmt.Errorf("failed to query instances: %v", err)
	}

	// TODO if hosts not contains label "master" and "node", should delete it
	// if err = checkCrrentHostsLabel(driver); err != nil {
	// }
	if err = a.ReconcileByRole(infra, driver, "master"); err != nil {
		return nil, err
	}
	if err = a.ReconcileByRole(infra, driver, "node"); err != nil {
		return nil, err
	}

	return nil, nil
}

func (a *Applier) ReconcileByRole(infra *v1.Infra, driver Driver, role string) error {
	current := GetHostsByRole(a.currentHosts, role)
	desired := GetHostsByRole(infra.Spec.Hosts, role)

	count := len(desired) - len(current)
	if count == 0 {
		// Number of servers as expected
		return nil
	}
	if count > 0 {
		// Not enough servers，should create number of "count" servers
		host := desired[0]
		host.Count = count
		return driver.CreateInstances(&host, infra)
	}
	if count < 0 {
		for i := 0; i < count; i++ {
			if err := driver.DeleteInstances(current[i].Metadata[0].ID, infra); err != nil {
				return fmt.Errorf("delete instance failed: %v", err)
			}
		}
	}

	// TODO check CPU memory disk...

	return nil
}

func GetHostsByRole(hosts []v1.Hosts, role string) (res []v1.Hosts) {
	for _, host := range hosts {
		if strings.NotIn(role, host.Roles) {
			continue
		}

		for i := 0; i < host.Count; i++ {
			h := hosts[i]
			h.Count = 1
			res = append(res, h)
		}
	}

	return res
}
