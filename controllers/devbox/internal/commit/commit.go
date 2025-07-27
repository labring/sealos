package commit

import (
	"context"
	"fmt"
	// "io"
	"log"
	"os"

	"github.com/containerd/containerd/v2/client"
	"github.com/containerd/containerd/v2/pkg/oci"
	"github.com/containerd/nerdctl/v2/pkg/api/types"
	"github.com/containerd/nerdctl/v2/pkg/cmd/container"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	runtimeapi "k8s.io/cri-api/pkg/apis/runtime/v1"
	// "github.com/containerd/containerd/v2/pkg/cio"
	// imageutil "github.com/labring/cri-shim/pkg/image"
)

type Committer interface {
	Commit(ctx context.Context, devboxName string, contentID string, baseImage string, commitImage string) error
}

type CommitterImpl struct {
	runtimeServiceClient runtimeapi.RuntimeServiceClient // CRI client
	containerdClient     *client.Client    // containerd client
}

// NewCommitter new a CommitterImpl
func NewCommitter() (Committer,error) {
	// create gRPC connection
	conn, err := grpc.NewClient(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}

	// create Containerd client
	containerdClient, err := client.NewWithConn(conn, client.WithDefaultNamespace(namespace))
	if err != nil {
		return nil, err
	}

	// create CRI client
	runtimeServiceClient := runtimeapi.NewRuntimeServiceClient(conn)

	return &CommitterImpl{
		runtimeServiceClient: runtimeServiceClient,
		containerdClient:     containerdClient,
	}, nil
}

// CreateContainer create container
func (c *CommitterImpl) CreateContainer(ctx context.Context, devboxName string, contentID string, baseImage string) (string,error) {
	fmt.Println("========>>>> create container", devboxName, contentID, baseImage)
	// 1. get image
	image, err := c.containerdClient.GetImage(ctx, baseImage)
	if err != nil {
		return "", fmt.Errorf("failed to get image: %v", err)
	}

	// 2. create container
	// add annotations/labels
	annotations := map[string]string{
		"devbox.sealos.io/content-id": contentID,
		"namespace":                   namespace,
		"image.name":                  baseImage,
		// "container.type":              "direct",
		// "description":                 "Container created directly via containerd API",
	}

	containerName := fmt.Sprintf("%s-container", devboxName)	// container name

	container, err := c.containerdClient.NewContainer(ctx, containerName,
		client.WithImage(image),
		client.WithNewSnapshot(containerName, image),
		client.WithContainerLabels(annotations), // add annotations
		client.WithNewSpec(oci.WithImageConfig(image),
			// oci.WithProcessArgs("/bin/sh", "-c", "while true; do echo 'Hello, World!'; sleep 5; done"),
			// oci.WithHostname("test-container"),
		),
	)
	if err != nil {
		return "", fmt.Errorf("failed to create container: %v", err)
	}

	return container.ID(), nil
}

// DeleteContainerDirectly delete container directly
func (c *CommitterImpl) DeleteContainerDirectly(ctx context.Context, containerName string) error {
	// load container
	container, err := c.containerdClient.LoadContainer(ctx, containerName)
	if err != nil {
		return fmt.Errorf("failed to load container: %v", err)
	}

	// delete container (include snapshot)
	err = container.Delete(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete container: %v", err)
	}

	log.Printf("Container deleted: %s", containerName)
	return nil
}

// Commit commit container to image
func (c *CommitterImpl) Commit(ctx context.Context, devboxName string, contentID string, baseImage string, commitImage string) error {
	fmt.Println("========>>>> commit devbox", devboxName, contentID, baseImage, commitImage)
	containerID,err:=c.CreateContainer(ctx, devboxName, contentID, baseImage)
	if err != nil {
		return fmt.Errorf("failed to create container: %v", err)
	}

	global := types.GlobalCommandOptions{
		Namespace:        namespace,
		Address:          address,
		DataRoot:         dataRoot,
		InsecureRegistry: insecureRegistry,
	}

	opt := types.ContainerCommitOptions{
		// Stdout:   io.Discard,
		Stdout:   os.Stdout,
		GOptions: global,
		Pause:    pauseContainerDuringCommit,
		DevboxOptions: types.DevboxOptions{
			RemoveBaseImageTopLayer: true,
		},
	}
	return container.Commit(ctx, c.containerdClient, commitImage, containerID, opt)
}

// GetContainerAnnotations get container annotations
func (c *CommitterImpl) GetContainerAnnotations(ctx context.Context, containerName string) (map[string]string, error) {
	container, err := c.containerdClient.LoadContainer(ctx, containerName)
	if err != nil {
		return nil, fmt.Errorf("failed to load container: %v", err)
	}

	// get container labels (annotations)
	labels, err := container.Labels(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get container labels: %v", err)
	}
	return labels, nil
}

type GcHandler interface {
	GC(ctx context.Context) error
}

type Handler struct {
}
