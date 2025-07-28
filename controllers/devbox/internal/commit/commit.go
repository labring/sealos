package commit

import (
	"context"
	"fmt"
	"io"
	"log"

	// "os"

	// "github.com/containerd/containerd"
	"github.com/containerd/containerd/v2/client"
	"github.com/containerd/containerd/v2/pkg/oci"
	"github.com/containerd/nerdctl/v2/pkg/api/types"
	"github.com/containerd/nerdctl/v2/pkg/cmd/container"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	runtimeapi "k8s.io/cri-api/pkg/apis/runtime/v1"
	"github.com/containerd/containerd/v2/pkg/namespaces"
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

	// create Containerd client: default namespace in const.go
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
	ctx = namespaces.WithNamespace(ctx, namespace)
	image, err := c.containerdClient.GetImage(ctx, baseImage)
	if err != nil {
        // image not found, try to pull
        log.Printf("Image %s not found, pulling...", baseImage)
        image, err = c.containerdClient.Pull(ctx, baseImage, client.WithPullUnpack)
        if err != nil {
            return "", fmt.Errorf("failed to pull image %s: %v", baseImage, err)
        }
    }

	// 2. create container
	// add annotations/labels
	annotations := map[string]string{
		annotationKeyContentID:           contentID,
		annotationKeyNamespace:           namespace,
		annotationKeyImageName:           baseImage,
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

// DeleteContainer delete container
func (c *CommitterImpl) DeleteContainer(ctx context.Context, containerName string) error {
	// load container
	ctx = namespaces.WithNamespace(ctx, namespace)
	container, err := c.containerdClient.LoadContainer(ctx, containerName)
	if err != nil {
		return fmt.Errorf("failed to load container: %v", err)
	}

	// try to get and stop task
	task, err := container.Task(ctx, nil)
	if err == nil {
		log.Printf("Stopping task for container: %s", containerName)

		// force kill task 
		err = task.Kill(ctx, 9) // SIGKILL
		if err != nil {
			log.Printf("Warning: failed to send SIGKILL: %v", err)
		} else {
			log.Printf("Sent SIGKILL to task")
		}

		// delete task 
		log.Printf("Deleting task...")
		_, err = task.Delete(ctx, client.WithProcessKill)
		if err != nil {
			log.Printf("Warning: failed to delete task: %v", err)
		} else {
			log.Printf("Task deleted for container: %s", containerName)
		}
	}

	// delete container (include snapshot)
	err = container.Delete(ctx,client.WithSnapshotCleanup)
	if err != nil {
		return fmt.Errorf("failed to delete container: %v", err)
	}

	log.Printf("Container deleted: %s", containerName)
	return nil
}

// Commit commit container to image
func (c *CommitterImpl) Commit(ctx context.Context, devboxName string, contentID string, baseImage string, commitImage string) error {
	fmt.Println("========>>>> commit devbox", devboxName, contentID, baseImage, commitImage)
	ctx = namespaces.WithNamespace(ctx, namespace)
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
		Stdout:   io.Discard,
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
	ctx = namespaces.WithNamespace(ctx, namespace)
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
	containerdClient *client.Client
}

func NewGcHandler(containerdClient *client.Client) GcHandler {
	return &Handler{
		containerdClient: containerdClient,
	}
}

func (h *Handler) GC(ctx context.Context) error {
	log.Printf("Starting GC in namespace: %s", namespace)
	ctx = namespaces.WithNamespace(ctx, namespace)
	// get all container in namespace
	containers,err:=h.containerdClient.Containers(ctx)
	if err !=nil{
		log.Printf("Failed to get containers, err: %v", err)
		return err
	}

	var deletedContainersCount int
	for _,container:=range containers{
		// if get container's labels failed, skip
		labels,err:=container.Labels(ctx)
		if err!=nil{
			log.Printf("Failed to get labels for container %s, err: %v",container.ID(),err)
			continue
		}
		// if container is not devbox container, skip
		if _,ok:=labels[annotationKeyContentID];!ok{
			continue 
		}

		// get container task
		task,err:=container.Task(ctx,nil)
		if err!=nil{
			// delete orphan container
			log.Printf("Found Orphan Container: %s",container.ID())
			err=container.Delete(ctx,client.WithSnapshotCleanup)
			if err!=nil{
				log.Printf("Failed to delete Orphan Container %s, err: %v",container.ID(),err)
			}else{
				log.Printf("Deleted Orphan Container: %s successfully",container.ID())
				deletedContainersCount++
			}
			continue
		}

		status,err:=task.Status(ctx)
		if err!=nil{
			log.Printf("Failed to get task status for container %s, err: %v",container.ID(),err)
			continue
		}
		if status.Status!=client.Running{
			// delete task
			_,err=task.Delete(ctx,client.WithProcessKill)
			if err!=nil{
				log.Printf("Failed to delete task for container %s, err: %v",container.ID(),err)
			}

			// delete container and snapshot
			err=container.Delete(ctx,client.WithSnapshotCleanup)
			if err!=nil{
				log.Printf("Failed to delete container %s, err: %v",container.ID(),err)
			}else{
				log.Printf("Deleted Container: %s successfully",container.ID())
				deletedContainersCount++
			}
		}

	}
	log.Printf("GC completed, deleted %d containers",deletedContainersCount)
	return nil
}
