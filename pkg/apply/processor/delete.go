package processor

import (
	"fmt"

	"github.com/fanux/sealos/pkg/clusterfile"
	"github.com/fanux/sealos/pkg/filesystem"
	"github.com/fanux/sealos/pkg/image"
	"github.com/fanux/sealos/pkg/runtime"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	fileutil "github.com/fanux/sealos/pkg/utils/file"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

type DeleteProcessor struct {
	ClusterManager image.ClusterService
	ImageManager   image.Service
	ClusterFile    clusterfile.Interface
	img            *v1.Image
	cManifest      *image.ClusterManifest
}

// Execute :according to the different of desired cluster to delete cluster.
func (d DeleteProcessor) Execute(cluster *v2.Cluster) (err error) {
	d.cManifest, err = d.ClusterManager.Inspect(cluster.Name)
	if err != nil {
		return fmt.Errorf("failed to inspect cluster, %v", err)
	}
	d.img, err = d.ImageManager.Inspect(cluster.Spec.Image)
	if err != nil {
		return fmt.Errorf("failed to inspect image, %v", err)
	}

	runTime, err := runtime.NewDefaultRuntime(cluster, d.ClusterFile.GetKubeadmConfig(), d.img)
	if err != nil {
		return fmt.Errorf("failed to init runtime, %v", err)
	}

	err = runTime.Reset()
	if err != nil {
		return err
	}

	pipLine, err := d.GetPipeLine()
	if err != nil {
		return err
	}

	for _, f := range pipLine {
		if err = f(cluster); err != nil {
			return err
		}
	}

	return nil
}
func (d DeleteProcessor) GetPipeLine() ([]func(cluster *v2.Cluster) error, error) {
	var todoList []func(cluster *v2.Cluster) error
	todoList = append(todoList,
		d.UnMountRootfs,
		d.UnMountImage,
		d.CleanFS,
	)
	return todoList, nil
}

func (d DeleteProcessor) UnMountRootfs(cluster *v2.Cluster) error {
	hosts := append(cluster.GetMasterIPList(), cluster.GetNodeIPList()...)
	fs, err := filesystem.NewRootfsMounter(d.cManifest, d.img)
	if err != nil {
		return err
	}
	return fs.UnMountRootfs(cluster, hosts)
}

func (d DeleteProcessor) UnMountImage(cluster *v2.Cluster) error {
	return d.ClusterManager.Delete(cluster.Name)
}

func (d DeleteProcessor) CleanFS(cluster *v2.Cluster) error {
	workDir := contants.ClusterDir(cluster.Name)
	dataDir := contants.NewData(cluster.Name).Homedir()
	return fileutil.CleanFiles(workDir, dataDir)
}

func NewDeleteProcessor(clusterFile clusterfile.Interface) (Interface, error) {
	imgSvc, err := image.NewImageService()
	if err != nil {
		return nil, err
	}
	clusterSvc, err := image.NewDefaultClusterService()
	if err != nil {
		return nil, err
	}

	return DeleteProcessor{
		ClusterFile:    clusterFile,
		ImageManager:   imgSvc,
		ClusterManager: clusterSvc,
	}, nil
}
