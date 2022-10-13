package controllers

import (
	"context"
	"fmt"
	"math"
	"os"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/yaml"
)

type Resource struct {
	Name     string
	Price    float64
	Unit     string
	Describe string
}

var priceMsg string

// CalculateCost calculate all cost
func (r *MeteringReconcile) CalculateCost(ctx context.Context, metering *meteringv1.Metering) (int64, error) {
	infraAmount, err := r.calculateInfraCost(ctx)
	if err != nil {
		r.Logger.Error(err, "Failed to get InfraCost")
		//return 0,err
	}
	nsAmount, err := r.calculateNSCost(ctx, metering)
	if err != nil {
		r.Logger.Error(err, "Failed to get NSCost")
		//return 0,err
	}
	amount := infraAmount + nsAmount
	return amount, nil
}

func (r *MeteringReconcile) calculateInfraCost(ctx context.Context) (int64, error) {
	infraList := &infrav1.InfraList{}
	err := r.List(ctx, infraList)
	if client.IgnoreNotFound(err) != nil {
		r.Logger.Error(err, "Failed to get InfraList")
		return 0, err
	}
	var amount int64
	for _, infra := range infraList.Items {
		count, err := infra.QueryPrice()
		r.Logger.Info("get infra :", "name: ", infra.Name, "namespace: ", infra.Namespace, "price: ", count)
		if err != nil {
			return 0, err
		}
		amount += count
	}
	// amount is preHour,but billing is perMinute
	amount /= 60
	r.Logger.V(1).Info("infra", "price:", amount)
	return amount, nil
}

func (r *MeteringReconcile) calculateNSCost(ctx context.Context, metering *meteringv1.Metering) (int64, error) {
	var quota corev1.ResourceQuota
	err := r.Get(ctx, client.ObjectKey{Namespace: metering.Spec.Namespace, Name: metering.Name}, &quota)
	if err != nil {
		r.Logger.Error(err, "Failed to get ResourceQuota")
	}
	var ResourceList map[corev1.ResourceName]Resource
	err = yaml.Unmarshal([]byte(os.Getenv("resource")), &ResourceList)
	if err != nil {
		return 0, err
	}
	var nsAmount float64
	priceMsg = ""
	r.Logger.Info("data list", ":", ResourceList)
	for resourceName, resourcePrice := range ResourceList {
		switch resourceName {
		case corev1.ResourceCPU:
			nsAmount += r.PhasePrice(resourcePrice, quota.Status.Used.Cpu().MilliValue())

		case corev1.ResourceMemory:
			nsAmount += r.PhasePrice(resourcePrice, quota.Status.Used.Memory().Value())

		case corev1.ResourceStorage:
			nsAmount += r.PhasePrice(resourcePrice, quota.Status.Used.Storage().Value())

		case corev1.ResourceEphemeralStorage:
			nsAmount += r.PhasePrice(resourcePrice, quota.Status.Used.StorageEphemeral().Value())
		}
	}
	r.Logger.V(1).Info("resource price", "price:", priceMsg)
	r.Logger.V(1).Info("get used quota resource", "cpu: ", quota.Status.Used.Cpu().MilliValue(), "memory: ", quota.Status.Used.Memory().Value(), "storage: ", quota.Status.Used.Memory().Value(), "storageEphemeral: ", quota.Status.Used.StorageEphemeral().Value())
	return int64(nsAmount), nil
}

func PhaseUnit(uint string) float64 {
	switch uint {
	case "K":
		return 3
	case "M":
		return 6
	case "G":
		return 9
	default:
		return 1
	}
}

func (r *MeteringReconcile) PhasePrice(resource Resource, used int64) float64 {
	price := float64(used) / math.Pow(10, PhaseUnit(resource.Unit)) * resource.Price
	priceMsg += fmt.Sprintf("%s: %.2f; ", resource.Name, price)
	return price
}
