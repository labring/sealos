package commit

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/containerd/containerd/v2/pkg/namespaces"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	baseImageBusyBox = "docker.io/library/busybox:latest"
	baseImageNginx   = "docker.io/library/nginx:latest"
	baseImageAlpine  = "docker.io/library/alpine:latest"
)

// init Committer
func TestNewCommitter(t *testing.T) {
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)
	assert.NotNil(t, committer)
}

// test commit flow
func TestCommitFlow(t *testing.T) {
	ctx := context.Background()

	// 1. create committer
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)

	// 2. prepare test data
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	contentID := "test-content-id-123"
	commitImage := fmt.Sprintf("test-devbox-commit-%d", time.Now().Unix())

	// 3. create container and commit container
	_, err = committer.Commit(ctx, devboxName, contentID, baseImageBusyBox, commitImage)
	assert.NoError(t, err)
}

// test create container
func TestCreateContainer(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)

	// create container
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	contentID := fmt.Sprintf("test-content-id-%d", time.Now().Unix())
	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, baseImageNginx)
	assert.NoError(t, err)
	assert.NotEmpty(t, containerID)

	// verify container labels
	annotations, err := committer.(*CommitterImpl).GetContainerAnnotations(ctx, containerID)
	fmt.Printf("annotations: %+v\n", annotations)
	assert.NoError(t, err)
}

// test delete container
func TestDeleteContainer(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)

	// create a container
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, "test-content-id-789", baseImageAlpine)
	assert.NoError(t, err)

	// show all containers in current namespace
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	containers, err := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	assert.NoError(t, err)

	fmt.Printf("=== All Containers in current namespace ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(containers))

	// delete container
	err = committer.(*CommitterImpl).DeleteContainer(ctx, containerID)
	assert.NoError(t, err)

	containers, err = committer.(*CommitterImpl).containerdClient.Containers(ctx)
	assert.NoError(t, err)

	fmt.Printf("=== All Containers in current namespace ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(containers))

	// verify container is deleted (try to get labels should return error)
	_, err = committer.(*CommitterImpl).GetContainerAnnotations(ctx, containerID)
	assert.Error(t, err)
}

// test remove container
func TestRemoveContainer(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)
	// create a container
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, "test-content-id-789", baseImageAlpine)
	assert.NoError(t, err)

	// show all containers in current namespace
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	containers, err := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	assert.NoError(t, err)

	fmt.Printf("=== All Containers in current namespace ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(containers))

	// delete container
	err = committer.(*CommitterImpl).RemoveContainer(ctx, containerID)
	assert.NoError(t, err)

	containers, err = committer.(*CommitterImpl).containerdClient.Containers(ctx)
	assert.NoError(t, err)

	fmt.Printf("=== All Containers in current namespace ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(containers))

	// verify container is deleted (try to get labels should return error)
	_, err = committer.(*CommitterImpl).GetContainerAnnotations(ctx, containerID)
	assert.Error(t, err)
}

// test error cases
func TestErrorCases(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)

	// test use not exist image to create container
	_, err = committer.(*CommitterImpl).CreateContainer(ctx, "test-devbox", "test-content-id", "not-exist-image:latest")
	assert.Error(t, err)

	// test use not exist container to delete
	err = committer.(*CommitterImpl).DeleteContainer(ctx, "not-exist-container")
	assert.Error(t, err)

	// test get not exist container label
	_, err = committer.(*CommitterImpl).GetContainerAnnotations(ctx, "not-exist-container")
	assert.Error(t, err)
}

// test concurrent operations
func TestConcurrentOperations(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)

	// concurrent to create container
	containerCount := 3
	wg := sync.WaitGroup{}
	wg.Add(containerCount)
	var mu sync.Mutex
	containers := make([]string, containerCount)

	for i := 0; i < containerCount; i++ {
		go func(index int) {
			defer wg.Done()
			devboxName := fmt.Sprintf("test-devbox-concurrent-%d-%d", time.Now().Unix(), index)
			containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName,
				fmt.Sprintf("test-content-id-%d", index),
				baseImageBusyBox)
			if err != nil {
				t.Errorf("Failed to create container: %v", err)
				return
			}
			mu.Lock()
			containers = append(containers, containerID)
			mu.Unlock()
		}(i)
	}
	wg.Wait()

	// delete containers
	for _, containerID := range containers {
		err := committer.(*CommitterImpl).RemoveContainer(ctx, containerID)
		if err != nil {
			t.Logf("Warning: failed to delete container %s: %v", containerID, err)
		}
	}

	// get current containers list
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	currentContainers, _ := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	fmt.Printf("=== All Containers in current namespace ===\n")
	for _, container := range currentContainers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(currentContainers))
}

// test gc handler
func TestGCHandler(t *testing.T) {
	// new Committer and GCHandler
	committer, err := NewCommitter("", "", "")
	require.NoError(t, err)
	gcHandler := NewGcHandler(committer.(*CommitterImpl).containerdClient)

	// create 5 containers
	testCountainers := []struct {
		devboxName string
		contentID  string
		baseImage  string
	}{
		{"test-gc-devbox-1", "test-gc-content-id-1", baseImageBusyBox},
		{"test-gc-devbox-2", "test-gc-content-id-2", baseImageNginx},
		{"test-gc-devbox-3", "test-gc-content-id-3", baseImageAlpine},
		{"test-gc-devbox-4", "test-gc-content-id-4", baseImageBusyBox},
		{"test-gc-devbox-5", "test-gc-content-id-5", baseImageNginx},
	}

	for _, container := range testCountainers {
		_, err := committer.(*CommitterImpl).CreateContainer(context.Background(), container.devboxName, container.contentID, container.baseImage)
		require.NoError(t, err)
	}

	// show all containers before gc
	ctx := namespaces.WithNamespace(context.Background(), DefaultNamespace)
	currentContainers, _ := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	fmt.Printf("=== All Containers before gc ===\n")
	for _, container := range currentContainers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(currentContainers))

	// gc:
	err = gcHandler.GC(context.Background())
	require.NoError(t, err)

	// verify containers are deleted
	// get current containers list
	afterContainers, _ := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	fmt.Printf("=== All Containers after gc ===\n")
	for _, container := range afterContainers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(afterContainers))
}

// test runtime selection
func TestRuntimeSelection(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)

	// create container with specific runtime
	devboxName := fmt.Sprintf("test-runtime-%d", time.Now().Unix())
	contentID := "test-runtime-content-id"

	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, baseImageBusyBox)
	assert.NoError(t, err)
	assert.NotEmpty(t, containerID)

	// get container info to verify runtime
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	container, err := committer.(*CommitterImpl).containerdClient.LoadContainer(ctx, containerID)
	assert.NoError(t, err)

	info, err := container.Info(ctx)
	assert.NoError(t, err)

	fmt.Printf("=== Container Runtime Information ===\n")
	fmt.Printf("Container ID: %s\n", containerID)
	fmt.Printf("Runtime Name: %s\n", info.Runtime.Name)
	fmt.Printf("Runtime Options: %+v\n", info.Runtime.Options)
	fmt.Printf("Expected Runtime: %s\n", DefaultRuntime)
	fmt.Printf("Runtime Match: %v\n", info.Runtime.Name == DefaultRuntime)

	// cleanup
	err = committer.(*CommitterImpl).DeleteContainer(ctx, containerID)
	assert.NoError(t, err)
}

// test connection management
func TestConnectionManagement(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)
	defer committer.(*CommitterImpl).Close()

	// test connection check
	err = committer.(*CommitterImpl).CheckConnection(ctx)
	assert.NoError(t, err)

	// create container
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	contentID := "903b3c87-1458-4dd8-b0f4-9da7184cf8ca"
	testImage := "ghcr.io/labring-actions/devbox/go-1.23.0:13aacd8"
	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, testImage)
	assert.NoError(t, err)
	assert.NotEmpty(t, containerID)

	// delete container
	err = committer.(*CommitterImpl).RemoveContainer(ctx, containerID)
	assert.NoError(t, err)

	// test reconnect
	err = committer.(*CommitterImpl).Reconnect(ctx)
	assert.NoError(t, err)

	// create container again
	containerID, err = committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, testImage)
	assert.NoError(t, err)
	assert.NotEmpty(t, containerID)

	// test connection check again
	err = committer.(*CommitterImpl).CheckConnection(ctx)
	assert.NoError(t, err)

	err = committer.(*CommitterImpl).RemoveContainer(ctx, containerID)
	assert.NoError(t, err)

	// test connection check again
	err = committer.(*CommitterImpl).CheckConnection(ctx)
	assert.NoError(t, err)

	fmt.Printf("Connection management test passed\n")
}

// test push to Docker Hub
func TestPushToDockerHub(t *testing.T) {
	ctx := context.Background()

	// use test registry
	registryAddr := "docker.io"
	registryUser := "cunzili"
	registryPassword := "123456789"

	committer, err := NewCommitter(registryAddr, registryUser, registryPassword)
	if err != nil {
		t.Errorf("Skip Docker Hub push test: failed to create committer: %v", err)
	}

	// create a test image name
	testImageName := fmt.Sprintf("docker.io/cunzili/cunzili:test-%d", time.Now().Unix())

	// create a container and commit it to image
	devboxName := fmt.Sprintf("test-dockerhub-%d", time.Now().Unix())
	contentID := fmt.Sprintf("test-dockerhub-content-id-%d", time.Now().Unix())

	containerID, err := committer.Commit(ctx, devboxName, contentID, baseImageBusyBox, testImageName)
	if err != nil {
		t.Errorf("Skip Docker Hub push test: failed to create test image: %v", err)
	}
	// containers, err := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	// assert.NoError(t, err)
	// fmt.Printf("=== All Containers in current namespace ===\n")
	// for _, container := range containers {
	// 	fmt.Printf("Container ID: %s\n", container.ID())
	// }
	// fmt.Printf("=== Total Containers: %d\n", len(containers))

	// push to Docker Hub
	err = committer.Push(ctx, testImageName)
	if err != nil {
		t.Errorf("Failed to push image to Docker Hub: %v", err)
	} else {
		fmt.Printf("Successfully pushed image to Docker Hub: %s\n", testImageName)
		fmt.Printf("You can view the image at: https://hub.docker.com/r/cunzili/cunzili/tags\n")
	}

	// remove image
	err = committer.RemoveImage(ctx, testImageName, false, false)
	assert.NoError(t, err)

	// verify image is deleted
	_, err = committer.(*CommitterImpl).containerdClient.GetImage(ctx, testImageName)
	assert.Error(t, err)
	fmt.Println("can not find image:", testImageName)

	// remove container
	err = committer.(*CommitterImpl).RemoveContainer(ctx, containerID)
	assert.NoError(t, err)

	// verify container is deleted
	_, err = committer.(*CommitterImpl).containerdClient.LoadContainer(ctx, containerID)
	assert.Error(t, err)
	fmt.Println("can not find container:", containerID)
}

// test push without authentication
func TestPushWithoutAuth(t *testing.T) {
	ctx := context.Background()

	// no authentication
	registryAddr := "docker.io"
	registryUser := ""
	registryPassword := ""

	committer, err := NewCommitter(registryAddr, registryUser, registryPassword)
	if err != nil {
		t.Skipf("Skip no-auth push test: failed to create committer: %v", err)
	}

	// use a existing image for test
	testImageName := "docker.io/cunzili/cunzili:test-no-auth-1754277739"

	// create a container and commit it to image
	devboxName := fmt.Sprintf("test-no-auth-%d", time.Now().Unix())
	contentID := "test-no-auth-content-id"

	_, err = committer.Commit(ctx, devboxName, contentID, baseImageBusyBox, testImageName)
	if err != nil {
		t.Skipf("Skip no-auth push test: failed to create test image: %v", err)
	}

	// test push to Docker Hub (no authentication)
	err = committer.Push(ctx, testImageName)
	if err != nil {
		fmt.Printf("Expected error when pushing without auth: %v\n", err)
		// should fail, because it needs authentication
		t.Logf("Push failed as expected: %v", err)
	} else {
		t.Errorf("Push succeeded unexpectedly without authentication")
	}
}

// test remove image
func TestRemoveImage(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)

	// create a test devbox name and content id
	devboxName := fmt.Sprintf("test-remove-devbox-%d", time.Now().Unix())
	contentID := fmt.Sprintf("test-remove-content-id-%d", time.Now().Unix())
	imageName := fmt.Sprintf("test-remove-image-%d", time.Now().Unix())

	// create a container and commit it to image
	_, err = committer.Commit(ctx, devboxName, contentID, baseImageBusyBox, imageName)
	assert.NoError(t, err)

	// // push image
	// err = committer.Push(ctx, imageName)
	// assert.NoError(t, err)

	// remove image
	err = committer.(*CommitterImpl).RemoveImage(ctx, imageName, false, false)
	assert.NoError(t, err)

	// verify image is deleted
	_, err = committer.(*CommitterImpl).containerdClient.GetImage(ctx, imageName)
	assert.Error(t, err)
}
