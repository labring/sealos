package commit

import (
	"context"
	"fmt"
	"io"
	"log"
	"strings"

	"github.com/containerd/containerd/v2/client"
	"github.com/containerd/containerd/v2/pkg/namespaces"
	"github.com/containerd/nerdctl/v2/pkg/api/types"
	"github.com/containerd/nerdctl/v2/pkg/cmd/container"
	"github.com/containerd/nerdctl/v2/pkg/containerutil"
	ncdefaults "github.com/containerd/nerdctl/v2/pkg/defaults"
	"github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	runtimeapi "k8s.io/cri-api/pkg/apis/runtime/v1"
)

type Committer interface {
	Commit(ctx context.Context, devboxName string, contentID string, baseImage string, commitImage string) error
}

type CommitterImpl struct {
	runtimeServiceClient runtimeapi.RuntimeServiceClient // CRI client
	containerdClient     *client.Client                  // containerd client
}

// NewCommitter new a CommitterImpl
func NewCommitter() (Committer, error) {
	// create gRPC connection
	conn, err := grpc.NewClient(DefaultContainerdAddress, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}

	// create Containerd client: default namespace in const.go
	containerdClient, err := client.NewWithConn(conn, client.WithDefaultNamespace(DefaultNamespace))
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

// CreateContainer create container with labels
func (c *CommitterImpl) CreateContainer(ctx context.Context, devboxName string, contentID string, baseImage string) (string, error) {
	fmt.Println("========>>>> create container", devboxName, contentID, baseImage)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	global := NewGlobalOptionConfig()

	// create container with labels
	originalAnnotations := map[string]string{
		v1alpha1.AnnotationContentID:    contentID,
		v1alpha1.AnnotationInit:         AnnotationImageFromValue,
		v1alpha1.AnnotationStorageLimit: AnnotationUseLimitValue,
		AnnotationKeyNamespace:          DefaultNamespace,
		AnnotationKeyImageName:          baseImage,
	}

	// convert labels to "containerd.io/snapshot/devbox-" format
	convertedLabels := convertLabels(originalAnnotations)
	convertedAnnotations := convertMapToSlice(originalAnnotations)

	// create container options
	createOpt := types.ContainerCreateOptions{
		GOptions:       *global,
		Runtime:        DefaultRuntime, // user devbox runtime
		Name:           fmt.Sprintf("devbox-%s-container", devboxName),
		Pull:           "missing",
		InRun:          false, // not start container
		Rm:             false,
		LogDriver:      "json-file",
		StopSignal:     "SIGTERM",
		Restart:        "unless-stopped",
		Interactive:    false,  // not interactive, avoid conflict with Detach
		Cgroupns:       "host", // add cgroupns mode
		Detach:         true,   // run in background
		Rootfs:         false,
		Label:          convertedAnnotations,
		SnapshotLabels: convertedLabels,
		ImagePullOpt: types.ImagePullOptions{
			GOptions: types.GlobalCommandOptions{
				Snapshotter: DefaultSnapshotter,
			},
		},
	}

	// create network manager
	networkManager, err := containerutil.NewNetworkingOptionsManager(createOpt.GOptions,
		types.NetworkOptions{
			NetworkSlice: []string{DefaultNetworkMode},
		}, c.containerdClient)
	if err != nil {
		log.Println("failed to create network manager:", err)
		return "", fmt.Errorf("failed to create network manager: %v", err)
	}

	// create container
	container, cleanup, err := container.Create(ctx, c.containerdClient, []string{originalAnnotations[AnnotationKeyImageName]}, networkManager, createOpt)
	if err != nil {
		log.Println("failed to create container:", err)
		return "", fmt.Errorf("failed to create container: %v", err)
	}
	if cleanup != nil {
		defer cleanup()
	}

	log.Printf("container created successfully: %s\n", container.ID())
	return container.ID(), nil
}

// DeleteContainer delete container
func (c *CommitterImpl) DeleteContainer(ctx context.Context, containerName string) error {
	// load container
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
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
	err = container.Delete(ctx, client.WithSnapshotCleanup)
	if err != nil {
		return fmt.Errorf("failed to delete container: %v", err)
	}

	log.Printf("Container deleted: %s successfully", containerName)
	return nil
}

// RemoveContainer remove container
func (c *CommitterImpl) RemoveContainer(ctx context.Context, containerNames string) error {
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	global := NewGlobalOptionConfig()
	opt := types.ContainerRemoveOptions{
		Stdout:   io.Discard,
		Force:    false,
		Volumes:  false,
		GOptions: *global,
	}
	err := container.Remove(ctx, c.containerdClient, []string{containerNames}, opt)
	if err != nil {
		return fmt.Errorf("failed to remove container: %v", err)
	}
	return nil
}

// Commit commit container to image
func (c *CommitterImpl) Commit(ctx context.Context, devboxName string, contentID string, baseImage string, commitImage string) error {
	fmt.Println("========>>>> commit devbox", devboxName, contentID, baseImage, commitImage)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	containerID, err := c.CreateContainer(ctx, devboxName, contentID, baseImage)
	if err != nil {
		return fmt.Errorf("failed to create container: %v", err)
	}

	// create commit options
	global := NewGlobalOptionConfig()
	opt := types.ContainerCommitOptions{
		Stdout:   io.Discard,
		GOptions: *global,
		Pause:    PauseContainerDuringCommit,
		DevboxOptions: types.DevboxOptions{
			RemoveBaseImageTopLayer: DevboxOptionsRemoveBaseImageTopLayer,
		},
	}

	// commit container
	err = container.Commit(ctx, c.containerdClient, commitImage, containerID, opt)
	// if commit failed, delete container
	if err != nil {
		// delete container
		err = c.RemoveContainer(ctx, containerID)
		if err != nil {
			log.Printf("Warning: failed to delete container %s: %v", containerID, err)
		}
		return fmt.Errorf("failed to commit container: %v", err)
	}

	// commit success, delete container
	return c.RemoveContainer(ctx, containerID)
}

// GetContainerAnnotations get container annotations
func (c *CommitterImpl) GetContainerAnnotations(ctx context.Context, containerName string) (map[string]string, error) {
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
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

// GC gc container
func (h *Handler) GC(ctx context.Context) error {
	log.Printf("Starting GC in namespace: %s", DefaultNamespace)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	// get all container in namespace
	containers, err := h.containerdClient.Containers(ctx)
	if err != nil {
		log.Printf("Failed to get containers, err: %v", err)
		return err
	}

	var deletedContainersCount int
	for _, container := range containers {
		// if get container's labels failed, skip
		labels, err := container.Labels(ctx)
		if err != nil {
			log.Printf("Failed to get labels for container %s, err: %v", container.ID(), err)
			continue
		}
		// if container is not devbox container, skip
		if _, ok := labels[v1alpha1.AnnotationContentID]; !ok {
			continue
		}

		// get container task
		task, err := container.Task(ctx, nil)
		if err != nil {
			// delete orphan container
			log.Printf("Found Orphan Container: %s", container.ID())
			err = container.Delete(ctx, client.WithSnapshotCleanup)
			if err != nil {
				log.Printf("Failed to delete Orphan Container %s, err: %v", container.ID(), err)
			} else {
				log.Printf("Deleted Orphan Container: %s successfully", container.ID())
				deletedContainersCount++
			}
			continue
		}

		status, err := task.Status(ctx)
		if err != nil {
			log.Printf("Failed to get task status for container %s, err: %v", container.ID(), err)
			continue
		}
		if status.Status != client.Running {
			// delete task
			_, err = task.Delete(ctx, client.WithProcessKill)
			if err != nil {
				log.Printf("Failed to delete task for container %s, err: %v", container.ID(), err)
			}

			// delete container and snapshot
			err = container.Delete(ctx, client.WithSnapshotCleanup)
			if err != nil {
				log.Printf("Failed to delete container %s, err: %v", container.ID(), err)
			} else {
				log.Printf("Deleted Container: %s successfully", container.ID())
				deletedContainersCount++
			}
		}
	}
	log.Printf("GC completed, deleted %d containers", deletedContainersCount)
	return nil
}

// convertLabels convert labels to "containerd.io/snapshot/devbox-" format
func convertLabels(labels map[string]string) map[string]string {
	convertedLabels := make(map[string]string)
	for key, value := range labels {
		if strings.HasPrefix(key, ContainerLabelPrefix) {
			// convert "devbox.sealos.io/" to "containerd.io/snapshot/devbox-"
			newKey := SnapshotLabelPrefix + key[len(ContainerLabelPrefix):]
			convertedLabels[newKey] = value
		}
	}
	return convertedLabels
}

// convertMapToSlice convert map to slice
func convertMapToSlice(labels map[string]string) []string {
	slice := make([]string, 0, len(labels))
	for key, value := range labels {
		slice = append(slice, fmt.Sprintf("%s=%s", key, value))
	}
	return slice
}

// NewGlobalOptionConfig new global option config
func NewGlobalOptionConfig() *types.GlobalCommandOptions {
	return &types.GlobalCommandOptions{
		Namespace:        DefaultNamespace,
		Address:          DefaultContainerdAddress,
		DataRoot:         DefaultDataRoot,
		Debug:            false,
		DebugFull:        false,
		Snapshotter:      DefaultSnapshotter,
		CNIPath:          ncdefaults.CNIPath(),
		CNINetConfPath:   ncdefaults.CNINetConfPath(),
		CgroupManager:    ncdefaults.CgroupManager(),
		InsecureRegistry: false,
		HostsDir:         ncdefaults.HostsDirs(),
		Experimental:     true,
		HostGatewayIP:    ncdefaults.HostGatewayIP(),
		KubeHideDupe:     false,
		CDISpecDirs:      ncdefaults.CDISpecDirs(),
		UsernsRemap:      "",
		DNS:              []string{},
		DNSOpts:          []string{},
		DNSSearch:        []string{},
	}
}
