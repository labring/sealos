package gpu

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// nvidia labels for gpu
const (
	NvidiaGpuKey                          = "nvidia.com/gpu"
	NvidiaCudaDriverMajorKey              = "nvidia.com/cuda.driver.major"
	NvidiaCudaDriverMinorKey              = "nvidia.com/cuda.driver.minor"
	NvidiaCudaDriverRevKey                = "nvidia.com/cuda.driver.rev"
	NvidiaCudaRuntimeMajorKey             = "nvidia.com/cuda.runtime.major"
	NvidiaCudaRuntimeMinorKey             = "nvidia.com/cuda.runtime.minor"
	NvidiaGfdTimestampKey                 = "nvidia.com/gfd.timestamp"
	NvidiaGpuComputeMajorKey              = "nvidia.com/gpu.compute.major"
	NvidiaGpuComputeMinorKey              = "nvidia.com/gpu.compute.minor"
	NvidiaGpuCountKey                     = "nvidia.com/gpu.count"
	NvidiaGpuDeployContainerToolkitKey    = "nvidia.com/gpu.deploy.container-toolkit"
	NvidiaGpuDeployDcgmKey                = "nvidia.com/gpu.deploy.dcgm"
	NvidiaGpuDeployDcgmExporterKey        = "nvidia.com/gpu.deploy.dcgm-exporter"
	NvidiaGpuDeployDevicePluginKey        = "nvidia.com/gpu.deploy.device-plugin"
	NvidiaGpuDeployDriverKey              = "nvidia.com/gpu.deploy.driver"
	NvidiaGpuDeployGpuFeatureDiscoveryKey = "nvidia.com/gpu.deploy.gpu-feature-discovery"
	NvidiaGpuDeployNodeStatusExporterKey  = "nvidia.com/gpu.deploy.node-status-exporter"
	NvidiaGpuDeployOperatorValidatorKey   = "nvidia.com/gpu.deploy.operator-validator"
	NvidiaGpuFamilyKey                    = "nvidia.com/gpu.family"
	NvidiaGpuMachineKey                   = "nvidia.com/gpu.machine"
	NvidiaGpuMemoryKey                    = "nvidia.com/gpu.memory"
	NvidiaGpuPresentKey                   = "nvidia.com/gpu.present"
	NvidiaGpuProductKey                   = "nvidia.com/gpu.product"
	NvidiaGpuReplicasKey                  = "nvidia.com/gpu.replicas"
	NvidiaMigCapableKey                   = "nvidia.com/mig.capable"
	NvidiaMigStrategyKey                  = "nvidia.com/mig.strategy"
)

type NvidiaGPU struct {
	GpuInfo    Information
	CudaInfo   CudaInformation
	GpuDeploy  Deployment
	GpuDetails DetailInformation
	MigInfo    MigInformation
}

type Information struct {
	Gpu         string
	GpuCount    string
	GpuPresent  string
	GpuProduct  string
	GpuReplicas string
}

type CudaInformation struct {
	CudaDriverMajor  string
	CudaDriverMinor  string
	CudaDriverRev    string
	CudaRuntimeMajor string
	CudaRuntimeMinor string
}

type Deployment struct {
	GpuDeployContainerToolkit    string
	GpuDeployDcgm                string
	GpuDeployDcgmExporter        string
	GpuDeployDevicePlugin        string
	GpuDeployDriver              string
	GpuDeployGpuFeatureDiscovery string
	GpuDeployNodeStatusExporter  string
	GpuDeployOperatorValidator   string
}

type DetailInformation struct {
	GpuComputeMajor string
	GpuComputeMinor string
	GpuFamily       string
	GpuMachine      string
	GpuMemory       string
	GfdTimestamp    string
}

type MigInformation struct {
	MigCapable  string
	MigStrategy string
}

//nvidia.com/gpu

func GetNodeGpuModel(c client.Client) (map[string]NvidiaGPU, error) {
	nodeList := &corev1.NodeList{}
	err := c.List(context.Background(), nodeList)
	if err != nil {
		return nil, err
	}

	gpuModels := make(map[string]NvidiaGPU)
	for _, node := range nodeList.Items {
		gpu := NvidiaGPU{
			GpuInfo: Information{
				Gpu:         node.Labels[NvidiaGpuKey],
				GpuCount:    node.Labels[NvidiaGpuCountKey],
				GpuPresent:  node.Labels[NvidiaGpuPresentKey],
				GpuProduct:  node.Labels[NvidiaGpuProductKey],
				GpuReplicas: node.Labels[NvidiaGpuReplicasKey],
			},
			CudaInfo: CudaInformation{
				CudaDriverMajor:  node.Labels[NvidiaCudaDriverMajorKey],
				CudaDriverMinor:  node.Labels[NvidiaCudaDriverMinorKey],
				CudaDriverRev:    node.Labels[NvidiaCudaDriverRevKey],
				CudaRuntimeMajor: node.Labels[NvidiaCudaRuntimeMajorKey],
				CudaRuntimeMinor: node.Labels[NvidiaCudaRuntimeMinorKey],
			},
			// fill in the rest similarly...
		}
		gpuModels[node.Name] = gpu
	}
	return gpuModels, nil
}
