package commit

import (
	"context"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"github.com/containerd/containerd/v2/client"
	"github.com/containerd/containerd/v2/core/remotes"
	"github.com/containerd/containerd/v2/core/remotes/docker"
	"github.com/containerd/containerd/v2/core/remotes/docker/config"
	"github.com/containerd/containerd/v2/core/snapshots"
	"github.com/containerd/containerd/v2/pkg/namespaces"
	"github.com/containerd/nerdctl/v2/pkg/api/types"
	"github.com/containerd/nerdctl/v2/pkg/cmd/container"
	"github.com/containerd/nerdctl/v2/pkg/cmd/image"
	"github.com/containerd/nerdctl/v2/pkg/cmd/login"
	"github.com/containerd/nerdctl/v2/pkg/containerutil"
	ncdefaults "github.com/containerd/nerdctl/v2/pkg/defaults"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	runtimeapi "k8s.io/cri-api/pkg/apis/runtime/v1"

	"github.com/labring/sealos/controllers/devbox/api/v1alpha2"
)

type Committer interface {
	CreateContainer(ctx context.Context, devboxName string, contentID string, baseImage string) (string, error)
	Commit(ctx context.Context, devboxName string, contentID string, baseImage string, commitImage string) (string, error)
	Push(ctx context.Context, imageName string) error
	RemoveImage(ctx context.Context, imageName string, force bool, async bool) error
	RemoveContainer(ctx context.Context, containerName string) error
	InitializeGC(ctx context.Context) error
	GC(ctx context.Context) error
	SetLvRemovable(ctx context.Context, containerID string, contentID string) error
}

type CommitterImpl struct {
	runtimeServiceClient runtimeapi.RuntimeServiceClient // CRI client
	containerdClient     *client.Client                  // containerd client
	conn                 *grpc.ClientConn                // gRPC connection
	globalOptions        *types.GlobalCommandOptions     // global options
	registryAddr         string
	registryUsername     string
	registryPassword     string
	// Merge base image layers control
	mergeBaseImageTopLayer bool
	// GC
	gcContainerMap map[string]struct{}
	gcImageMap     map[string]struct{}
	gcInterval     time.Duration
}

// NewCommitter new a CommitterImpl with registry configuration
func NewCommitter(registryAddr, registryUsername, registryPassword string, merge bool) (Committer, error) {
	var conn *grpc.ClientConn
	var err error

	// login to registry
	err = login.Login(context.Background(), types.LoginCommandOptions{
		GOptions:      *NewGlobalOptionConfig(),
		ServerAddress: registryAddr,
		Username:      registryUsername,
		Password:      registryPassword,
	}, io.Discard)
	if err != nil {
		return nil, err
	}

	// retry to connect
	for i := 0; i <= DefaultMaxRetries; i++ {
		if i > 0 {
			log.Printf("Retrying connection to containerd (attempt %d/%d)...", i, DefaultMaxRetries)
			time.Sleep(DefaultRetryDelay)
		}

		// create gRPC connection
		conn, err = grpc.NewClient(DefaultContainerdAddress, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err == nil {
			log.Printf("Successfully connected to containerd at %s", DefaultContainerdAddress)
			break
		}

		log.Printf("Failed to connect to containerd (attempt %d/%d): %v", i+1, DefaultMaxRetries+1, err)

		if i == DefaultMaxRetries {
			return nil, fmt.Errorf("failed to connect to containerd after %d attempts: %v", DefaultMaxRetries+1, err)
		}
	}

	// create Containerd client
	containerdClient, err := client.NewWithConn(conn, client.WithDefaultNamespace(DefaultNamespace))
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to create containerd client: %v", err)
	}

	// create CRI client
	runtimeServiceClient := runtimeapi.NewRuntimeServiceClient(conn)

	return &CommitterImpl{
		runtimeServiceClient:   runtimeServiceClient,
		containerdClient:       containerdClient,
		conn:                   conn,
		globalOptions:          NewGlobalOptionConfig(),
		registryAddr:           registryAddr,
		registryUsername:       registryUsername,
		registryPassword:       registryPassword,
		gcContainerMap:         make(map[string]struct{}),
		gcImageMap:             make(map[string]struct{}),
		gcInterval:             DefaultGcInterval,
		mergeBaseImageTopLayer: merge,
	}, nil
}

// CreateContainer create container with labels
func (c *CommitterImpl) CreateContainer(ctx context.Context, devboxName string, contentID string, baseImage string) (string, error) {
	fmt.Println("========>>>> create container", devboxName, contentID, baseImage)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)

	// check connection status, if connection is bad, try to reconnect
	if err := c.CheckConnection(ctx); err != nil {
		log.Printf("Connection check failed: %v, attempting to reconnect...", err)
		if reconnectErr := c.Reconnect(ctx); reconnectErr != nil {
			return "", fmt.Errorf("failed to reconnect: %v", reconnectErr)
		}
	}

	// create container with labels
	originalAnnotations := map[string]string{
		v1alpha2.AnnotationContentID:    contentID,
		v1alpha2.AnnotationStorageLimit: AnnotationUseLimitValue,
		AnnotationKeyNamespace:          DefaultNamespace,
		AnnotationKeyImageName:          baseImage,
	}

	// Add merge base image layers annotation if enabled
	if c.mergeBaseImageTopLayer {
		originalAnnotations[v1alpha2.AnnotationInit] = AnnotationImageFromValue
	}

	// convert labels to "containerd.io/snapshot/devbox-" format
	convertedLabels := convertLabels(originalAnnotations)
	convertedAnnotations := convertMapToSlice(originalAnnotations)

	// create container options
	createOpt := types.ContainerCreateOptions{
		GOptions:       *c.globalOptions,
		Runtime:        DefaultRuntime, // user devbox runtime
		Name:           fmt.Sprintf("devbox-%s-container-%d", devboxName, time.Now().UnixMicro()),
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
			GOptions: *c.globalOptions,
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

func (c *CommitterImpl) SetLvRemovable(ctx context.Context, containerID string, contentID string) error {
	fmt.Println("========>>>> set lv removable for container", contentID)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)

	// check connection status, if connection is bad, try to reconnect
	if err := c.CheckConnection(ctx); err != nil {
		log.Printf("Connection check failed: %v, attempting to reconnect...", err)
		if reconnectErr := c.Reconnect(ctx); reconnectErr != nil {
			return fmt.Errorf("failed to reconnect: %v", reconnectErr)
		}
	}

	_, err := c.containerdClient.SnapshotService(DefaultDevboxSnapshotter).Update(ctx, snapshots.Info{
		Name:   containerID,
		Labels: map[string]string{RemoveContentIDkey: contentID},
	}, "labels."+RemoveContentIDkey)
	if err != nil {
		return err
	}
	return nil
}

// RemoveContainer remove container
func (c *CommitterImpl) RemoveContainer(ctx context.Context, containerID string) error {
	// check containerID is not empty
	if containerID == "" {
		return fmt.Errorf("[RemoveContainer]containerID is empty")
	}

	fmt.Println("========>>>> remove container", containerID)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)

	// check connection status, if connection is bad, try to reconnect
	if err := c.CheckConnection(ctx); err != nil {
		log.Printf("Connection check failed: %v, attempting to reconnect...", err)
		if reconnectErr := c.Reconnect(ctx); reconnectErr != nil {
			return fmt.Errorf("failed to reconnect: %v", reconnectErr)
		}
	}

	global := NewGlobalOptionConfig()
	opt := types.ContainerRemoveOptions{
		Stdout:   io.Discard,
		Force:    false,
		Volumes:  false,
		GOptions: *global,
	}
	err := container.Remove(ctx, c.containerdClient, []string{containerID}, opt)
	if err != nil {
		return fmt.Errorf("failed to remove container: %v", err)
	}
	return nil
}

// Commit commit container to image
func (c *CommitterImpl) Commit(ctx context.Context, devboxName string, contentID string, baseImage string, commitImage string) (string, error) {
	fmt.Println("========>>>> commit devbox", devboxName, contentID, baseImage, commitImage)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	containerID, err := c.CreateContainer(ctx, devboxName, contentID, baseImage)
	if err != nil {
		return "", fmt.Errorf("failed to create container: %v", err)
	}

	// // mark for gc
	// defer c.MarkForGC(containerID, commitImage)

	// create commit options
	global := NewGlobalOptionConfig()
	opt := types.ContainerCommitOptions{
		Stdout:   io.Discard,
		GOptions: *global,
		Pause:    PauseContainerDuringCommit,
		// Remove base image top layer:
		DevboxOptions: types.DevboxOptions{
			RemoveBaseImageTopLayer: c.mergeBaseImageTopLayer,
		},
	}

	// commit container
	err = container.Commit(ctx, c.containerdClient, commitImage, containerID, opt)
	if err != nil {
		return "", fmt.Errorf("failed to commit container: %v", err)
	}

	return containerID, nil
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

// Push pushes an image to a remote repository
func (c *CommitterImpl) Push(ctx context.Context, imageName string) error {
	fmt.Println("========>>>> push image", imageName)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)

	// check connection status, if connection is bad, try to reconnect
	if err := c.CheckConnection(ctx); err != nil {
		log.Printf("Connection check failed: %v, attempting to reconnect...", err)
		if reconnectErr := c.Reconnect(ctx); reconnectErr != nil {
			return fmt.Errorf("failed to reconnect: %v", reconnectErr)
		}
	}

	//set resolver
	resolver, err := GetResolver(ctx, c.registryUsername, c.registryPassword)
	if err != nil {
		log.Printf("failed to set resolver, Image: %s, err: %v\n", imageName, err)
		return err
	}

	imageRef, err := c.containerdClient.GetImage(ctx, imageName)
	if err != nil {
		log.Printf("failed to get image: %s, err: %v\n", imageName, err)
		return err
	}

	// push image
	err = c.containerdClient.Push(ctx, imageName, imageRef.Target(),
		client.WithResolver(resolver),
	)
	if err != nil {
		log.Printf("failed to push image: %s, err: %v\n", imageName, err)
		return err
	}
	log.Printf("Pushed image success Image: %s\n", imageName)
	return nil
}

// RemoveImage remove image
func (c *CommitterImpl) RemoveImage(ctx context.Context, imageName string, force bool, async bool) error {
	fmt.Println("========>>>> remove image", imageName)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)

	// check connection status, if connection is bad, try to reconnect
	if err := c.CheckConnection(ctx); err != nil {
		log.Printf("Connection check failed: %v, attempting to reconnect...", err)
		if reconnectErr := c.Reconnect(ctx); reconnectErr != nil {
			return fmt.Errorf("failed to reconnect: %v", reconnectErr)
		}
	}

	global := NewGlobalOptionConfig()
	opt := types.ImageRemoveOptions{
		Stdout:   io.Discard,
		GOptions: *global,
		Force:    force,
		Async:    async,
	}
	return image.Remove(ctx, c.containerdClient, []string{imageName}, opt)
}

// MarkForGC mark container and image for GC
func (c *CommitterImpl) MarkForGC(containerID string, imageID string) {
	c.gcContainerMap[containerID] = struct{}{}
	c.gcImageMap[imageID] = struct{}{}
}

// GC start periodic GC
func (c *CommitterImpl) GC(ctx context.Context) error {
	ticker := time.NewTicker(c.gcInterval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				log.Printf("Starting periodic GC at: %v", time.Now())
				if err := c.normalGC(ctx); err != nil {
					log.Printf("Failed to GC, err: %v", err)
				}
			}
		}
	}()
	return nil
}

// normalGC gc container and image
func (c *CommitterImpl) normalGC(ctx context.Context) error {
	log.Printf("Starting normal GC in namespace: %s", DefaultNamespace)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	// get all container in namespace
	containers, err := c.containerdClient.Containers(ctx)
	if err != nil {
		log.Printf("Failed to get containers, err: %v", err)
		return err
	}

	// gc container
	for _, container := range containers {
		if _, ok := c.gcContainerMap[container.ID()]; ok {
			err = c.RemoveContainer(ctx, container.ID())
			if err != nil {
				log.Printf("Failed to remove container %s, err: %v", container.ID(), err)
			}
		}
	}

	// clear gcContainerMap
	c.gcContainerMap = make(map[string]struct{})

	// get all image in namespace
	images, err := c.containerdClient.ListImages(ctx)
	if err != nil {
		log.Printf("Failed to get images, err: %v", err)
		return err
	}

	// gc image
	for _, image := range images {
		if _, ok := c.gcImageMap[image.Name()]; ok {
			err = c.RemoveImage(ctx, image.Name(), false, false)
			if err != nil {
				log.Printf("Failed to remove image %s, err: %v", image.Name(), err)
			}
		}
	}

	// clear gcImageMap
	c.gcImageMap = make(map[string]struct{})

	return nil
}

// InitializeGC initialize force GC
func (c *CommitterImpl) InitializeGC(ctx context.Context) error {
	gcCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	if err := c.forceGC(gcCtx); err != nil {
		log.Printf("Failed to initialize force GC, err: %v", err)
		return fmt.Errorf("failed to initialize force GC: %v", err)
	}
	log.Println("Force GC initialized successfully")
	return nil
}

// forceGC force gc container and image
func (c *CommitterImpl) forceGC(ctx context.Context) error {
	log.Printf("Starting force GC in namespace: %s", DefaultNamespace)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	containers, err := c.containerdClient.Containers(ctx)
	if err != nil {
		log.Printf("Failed to get containers, err: %v", err)
		return err
	}

	// gc container
	for _, container := range containers {
		if err := c.RemoveContainer(ctx, container.ID()); err != nil {
			log.Printf("Failed to remove container %s, err: %v", container.ID(), err)
		}
	}
	c.gcContainerMap = make(map[string]struct{})

	// gc image
	images, err := c.containerdClient.ListImages(ctx)
	if err != nil {
		log.Printf("Failed to get images, err: %v", err)
		return err
	}
	for _, image := range images {
		if err := c.RemoveImage(ctx, image.Name(), false, false); err != nil {
			log.Printf("Failed to remove image %s, err: %v", image.Name(), err)
		}
	}
	c.gcImageMap = make(map[string]struct{})
	return nil
}

// GetResolver get resolver
func GetResolver(ctx context.Context, username string, secret string) (remotes.Resolver, error) {
	resolverOptions := docker.ResolverOptions{
		Tracker: docker.NewInMemoryTracker(),
	}
	hostOptions := config.HostOptions{}
	if username == "" && secret == "" {
		hostOptions.Credentials = nil
	} else {
		// TODO: fix this, use flags or configs to set mulit registry credentials
		hostOptions.Credentials = func(host string) (string, string, error) {
			return username, secret, nil
		}
	}
	hostOptions.DefaultScheme = "http"
	hostOptions.DefaultTLS = nil
	resolverOptions.Hosts = config.ConfigureHosts(ctx, hostOptions)
	return docker.NewResolver(resolverOptions), nil
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
		DataRoot:         DefaultNerdctlDataRoot,
		Debug:            false,
		DebugFull:        false,
		Snapshotter:      DefaultDevboxSnapshotter,
		CNIPath:          ncdefaults.CNIPath(),
		CNINetConfPath:   ncdefaults.CNINetConfPath(),
		CgroupManager:    ncdefaults.CgroupManager(),
		InsecureRegistry: InsecureRegistry,
		HostsDir:         []string{DefaultNerdctlHostsDir},
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

// CheckConnection check if the connection is still alive
func (c *CommitterImpl) CheckConnection(ctx context.Context) error {
	if c.conn == nil {
		return fmt.Errorf("connection is nil")
	}

	// check connection state
	state := c.conn.GetState()
	if state.String() == "TRANSIENT_FAILURE" || state.String() == "SHUTDOWN" {
		return fmt.Errorf("connection is in bad state: %s", state.String())
	}

	// try to ping containerd
	_, err := c.containerdClient.Version(ctx)
	if err != nil {
		return fmt.Errorf("failed to ping containerd: %v", err)
	}

	return nil
}

// Reconnect attempt to reconnect to containerd
func (c *CommitterImpl) Reconnect(ctx context.Context) error {
	log.Printf("Attempting to reconnect to containerd...")

	// close old connection
	if c.conn != nil {
		c.conn.Close()
	}

	var conn *grpc.ClientConn
	var err error

	for i := 0; i <= DefaultMaxRetries; i++ {
		if i > 0 {
			log.Printf("Retrying connection to containerd (attempt %d/%d)...", i, DefaultMaxRetries)
			time.Sleep(DefaultRetryDelay)
		}

		// create gRPC connection
		conn, err = grpc.NewClient(DefaultContainerdAddress, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err == nil {
			log.Printf("Successfully connected to containerd at %s", DefaultContainerdAddress)
			break
		}

		log.Printf("Failed to connect to containerd (attempt %d/%d): %v", i+1, DefaultMaxRetries+1, err)

		if i == DefaultMaxRetries {
			return fmt.Errorf("failed to connect to containerd after %d attempts: %v", DefaultMaxRetries+1, err)
		}
	}

	// recreate containerd client
	containerdClient, err := client.NewWithConn(conn, client.WithDefaultNamespace(DefaultNamespace))
	if err != nil {
		conn.Close()
		return fmt.Errorf("failed to recreate containerd client: %v", err)
	}

	// recreate CRI client
	runtimeServiceClient := runtimeapi.NewRuntimeServiceClient(conn)

	// update instance
	c.containerdClient = containerdClient
	c.runtimeServiceClient = runtimeServiceClient
	c.conn = conn

	log.Printf("Successfully reconnected to containerd")
	return nil
}

// Close close the connection
func (c *CommitterImpl) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
