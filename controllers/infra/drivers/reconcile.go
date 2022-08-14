package drivers

import (
	"fmt"
	"sort"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/pkg/utils/logger"
)

type Applier struct{}

func NewApplier() Reconcile {
	return &Applier{}
}

func setHostsIndex(infra *v1.Infra) {
	for i, hosts := range infra.Spec.Hosts {
		if hosts.Index != 0 {
			continue
		}
		infra.Spec.Hosts[i].Index = i
	}
}

func (a *Applier) ReconcileInstance(infra *v1.Infra, driver Driver) error {
	if len(infra.Spec.Hosts) == 0 {
		logger.Debug("desired host len is 0")
		return nil
	}

	setHostsIndex(infra)

	if !infra.DeletionTimestamp.IsZero() {
		logger.Debug("remove all hosts")
		for _, hosts := range infra.Spec.Hosts {
			if err := driver.DeleteInstances(&hosts); err != nil {
				return err
			}
		}
	}
	// get infra all hosts
	hosts, err := driver.GetInstances(infra)
	if err != nil {
		return fmt.Errorf("get all instances failed: %v", err)
	}
	// sort current hosts
	sortHostsByIndex(v1.IndexHosts(hosts))
	// merge current hosts list using index
	// sort  desired hosts
	sortHostsByIndex(v1.IndexHosts(infra.Spec.Hosts))

	if err = a.ReconcileHosts(hosts, infra, driver); err != nil {
		return err
	}

	return nil
}

func sortHostsByIndex(hosts v1.IndexHosts) {
	sort.Sort(hosts)
}

func (a *Applier) ReconcileHosts(current []v1.Hosts, infra *v1.Infra, driver Driver) error {
	desired := infra.Spec.Hosts
	for _, d := range desired {
		cur := getHostsByIndex(d.Index, current)
		if cur == nil {
			// TODO create hosts
			if err := driver.CreateInstances(&d, infra); err != nil {
				return fmt.Errorf("create instance failed: %v", err)
			}
			continue
		}

		count := d.Count - cur.Count
		if count == 0 {
			continue
		} else if count > 0 {
			host := d
			host.Count = count
			if err := driver.CreateInstances(&host, infra); err != nil {
				return fmt.Errorf("desired instance > current instance create instance failed: %v", err)
			}
		} else {
			host := cur
			host.Count = -count
			if err := driver.DeleteInstances(host); err != nil {
				return fmt.Errorf("desired instance < current instance delete instance failed: %v", err)
			}
		}

		// TODO check CPU memory...
	}

	return nil
}

func getHostsByIndex(index int, hosts []v1.Hosts) *v1.Hosts {
	for _, h := range hosts {
		if h.Index == index {
			return &h
		}
	}

	return nil
}
