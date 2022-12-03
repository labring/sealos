package drivers

import (
	"context"
	"fmt"
	"sort"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"

	"golang.org/x/sync/errgroup"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/pkg/utils/logger"
)

type Applier struct{}

func NewApplier() Reconcile {
	return &Applier{}
}

func setHostsIndex(infra *v1.Infra) {
	for i, hosts := range infra.Spec.Hosts {
		if hosts.Index == 0 {
			infra.Spec.Hosts[i].Index = i
		}
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
	hosts, err := driver.GetInstances(infra, types.InstanceStateNameRunning)
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

	cur, err := driver.GetInstances(infra, types.InstanceStateNameRunning)
	if err != nil {
		return fmt.Errorf("set current instances info failed: %v", err)
	}
	infra.Spec.Hosts = cur
	sortHostsByIndex(v1.IndexHosts(infra.Spec.Hosts))
	return nil
}

/*
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
	currHosts, err := driver.GetInstances(infra)
	if err != nil {
		return err
	}
	infra.Spec.Hosts = currHosts

	return nil
}
*/

func sortHostsByIndex(hosts v1.IndexHosts) {
	sort.Sort(hosts)
}

func sortDisksByName(disks v1.NameDisks) {
	sort.Sort(disks)
}

func (a *Applier) ReconcileHosts(current []v1.Hosts, infra *v1.Infra, driver Driver) error {
	desired := infra.Spec.Hosts
	// all roles executed on an infra(group by index)
	eg, _ := errgroup.WithContext(context.Background())
	if err := driver.CreateKeyPair(infra); err != nil {
		return err
	}
	for i := range desired {
		d := desired[i]
		cur := getHostsByIndex(d.Index, current)

		eg.Go(func() error {
			// current 0 instance -> create
			if cur == nil {
				logger.Info("current instance not exist create instance %#v", d)
				if err := driver.CreateInstances(&d, infra); err != nil {
					return fmt.Errorf("create instance failed: %v", err)
				}
				return nil
			}

			// instance.image change -> delete all instances -> create
			if cur.Image != d.Image {
				logger.Info("current instance image not equal desired instance image, delete current instance and create instance %#v", d)
				if err := driver.DeleteInstances(cur); err != nil {
					return fmt.Errorf("desired instance < current instance delete instance failed: %v", err)
				}
				if err := driver.CreateInstances(&d, infra); err != nil {
					return fmt.Errorf("create instance failed: %v", err)
				}
			}

			// (desire count > current count) -> delete superfluous instances
			count := d.Count - cur.Count
			if count < 0 {
				logger.Info("desired instance count < current instance count, delete superfluous instance %#v", d)
				host := cur
				host.Count = -count
				if err := driver.DeleteInstances(host); err != nil {
					return fmt.Errorf("desired instance < current instance delete instance failed: %v", err)
				}
				// desire 0 -> continue
				if d.Count == 0 {
					return nil
				}
				hosts, err := driver.GetInstances(infra, types.InstanceStateNameRunning)
				if err != nil {
					return fmt.Errorf("get all instances failed: %v", err)
				}
				sortHostsByIndex(v1.IndexHosts(hosts))
				cur = getHostsByIndex(d.Index, hosts)
			}

			if count > 0 {
				logger.Info("desired instance count > current instance count, create instance %#v", d)
				host := d
				host.Count = count
				if err := driver.CreateInstances(&host, infra); err != nil {
					return fmt.Errorf("desired instance > current instance create instance failed: %v", err)
				}
			}

			//if cur.Flavor != d.Flavor {
			//	logger.Info("current instance flavor not equal desired instance flavor, update instance %#v", d)
			//	if err := driver.ModifyInstances(cur, &d); err != nil {
			//		return fmt.Errorf("modify instances: %v", err)
			//	}
			//}

			// compare volume between current and desire
			// can't modify volume type when volume being used. can't smaller size when volume being used.
			//if !reflect.DeepEqual(cur.Disks, d.Disks) {
			//	if err := a.ReconcileDisks(infra, cur, d.Disks, driver); err != nil {
			//		return fmt.Errorf("ReconcileDisks failed: %v", err)
			//	}
			//}

			// TODO check CPU memory...
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return err
	}
	return nil
}

func (a *Applier) ReconcileDisks(infra *v1.Infra, current *v1.Hosts, des []v1.Disk, driver Driver) error {
	cur := current.Disks
	// sort disk for cur and des
	sortDisksByName(v1.NameDisks(des))
	sortDisksByName(v1.NameDisks(cur))
	Icur, Ides := 0, 0
	// compare
	for Icur < len(cur) && Ides < len(des) {
		curDisk, desDisk := cur[Icur], des[Ides]
		// same mount path, two pointers move to right
		if curDisk.Name == desDisk.Name {
			if err := driver.ModifyVolume(&curDisk, &desDisk); err != nil {
				return err
			}
			Icur++
			Ides++
		} else if curDisk.Name < desDisk.Name {
			// cur have but des don't have. delete cur volume and cur pointer move to right
			//if err := driver.DeleteVolume(curDisk.ID); err != nil {
			//	return err
			//}
			Icur++
		} else {
			// des have but cur don't have. create des volume and des pointer move to right
			if err := driver.CreateVolumes(infra, current, []v1.Disk{desDisk}); err != nil {
				return err
			}
			Ides++
		}
	}
	// volume owned by cur is not detected, should be deleted.
	//if Icur != len(cur) {
	//	for ; Icur < len(cur); Icur++ {
	//		curDisk := cur[Icur]
	//		if err := driver.DeleteVolume(curDisk.ID); err != nil {
	//			return err
	//		}
	//	}
	//}
	// volume owned by des is not detected, should be created.
	if Ides != len(des) {
		for ; Ides < len(des); Ides++ {
			desDisk := des[Ides]
			if err := driver.CreateVolumes(infra, current, []v1.Disk{desDisk}); err != nil {
				return err
			}
		}
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
