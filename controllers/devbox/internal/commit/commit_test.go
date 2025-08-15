package commit

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"sync/atomic"

	"github.com/containerd/containerd/v2/pkg/namespaces"
	"github.com/containerd/errdefs"
	"github.com/stretchr/testify/assert"
	// "github.com/stretchr/testify/require"
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

// TestAtomicLabels test containerd's atomic label update
func TestAtomicLabels(t *testing.T) {
	ctx := context.Background()
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)

	// 1. create a test container
	devboxName := fmt.Sprintf("test-atomic-%d", time.Now().Unix())
	contentID := fmt.Sprintf("test-atomic-content-%d", time.Now().Unix())
	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, baseImageBusyBox)
	assert.NoError(t, err)

	// ensure cleanup container after test
	defer func() {
		err := committer.RemoveContainer(ctx, containerID)
		if err != nil {
			fmt.Printf("Failed to cleanup container: %v", err)
		}
	}()

	// 2. get container object
	container, err := committer.(*CommitterImpl).containerdClient.LoadContainer(ctx, containerID)
	assert.NoError(t, err)

	// 3. concurrent update label count
	concurrentUpdates := 10
	successCount := int32(0)
	var wg sync.WaitGroup
	wg.Add(concurrentUpdates)

	// 4. concurrent update same label
	for i := 0; i < concurrentUpdates; i++ {
		go func(index int) {
			defer wg.Done()

			// get current label
			labels, err := container.Labels(ctx)
			if err != nil {
				fmt.Printf("Failed to get labels: %v", err)
				return
			}

			// copy label map
			newLabels := make(map[string]string)
			for k, v := range labels {
				newLabels[k] = v
			}

			// add or update test label
			val1 := fmt.Sprintf("value-%d", index)
			val2 := time.Now().Format(time.RFC3339Nano)
			newLabels["test-atomic-label"] = val1
			newLabels["timestamp"] = val2

			// try to update label
			_, err = container.SetLabels(ctx, newLabels)
			if err != nil {
				if errdefs.IsAlreadyExists(err) {
					fmt.Printf("Concurrent update detected for index %d\n", index)
				} else {
					fmt.Printf("Failed to set labels for index %d: %v\n", index, err)
				}
				return
			}

			// update success count
			atomic.AddInt32(&successCount, 1)
			fmt.Printf("Successfully updated labels for index %d, val1: %s, val2: %s\n", index, val1, val2)
		}(i)
	}

	// wait for all goroutine
	wg.Wait()

	// verify result
	finalLabels, err := container.Labels(ctx)
	assert.NoError(t, err)

	fmt.Printf("Final label value: %s\n", finalLabels["test-atomic-label"])
	fmt.Printf("Final timestamp: %s\n", finalLabels["timestamp"])
	fmt.Printf("Successful updates: %d/%d\n", successCount, concurrentUpdates)
}

// test get image
func TestGetImage(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	images, err := committer.(*CommitterImpl).containerdClient.ListImages(ctx)
	assert.NoError(t, err)
	for _, image := range images {
		fmt.Printf("Image ID: %s\n", image.Target().Digest.String())
	}
}

// test GC initialization and execution
func TestGCFlow(t *testing.T) {
	ctx := context.Background()
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)

	// create committer
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)
	defer committer.(*CommitterImpl).Close()

	// 1. first execute InitializeGC for initial cleanup
	err = committer.InitializeGC(ctx)
	assert.NoError(t, err)

	// 2. create some test resources
	var containerIDs []string
	var imageNames []string

	// create three test containers and images
	for i := 0; i < 3; i++ {
		devboxName := fmt.Sprintf("test-gc-devbox-%d-%d", time.Now().Unix(), i)
		contentID := fmt.Sprintf("test-gc-content-%d", i)
		commitImage := fmt.Sprintf("test-gc-image-%d-%d", time.Now().Unix(), i)

		containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, baseImageBusyBox)
		assert.NoError(t, err)
		containerIDs = append(containerIDs, containerID)
		imageNames = append(imageNames, commitImage)
	}

	// 3. verify resource creation success
	containers, err := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	assert.NoError(t, err)
	fmt.Printf("=== Created Containers ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}

	// 4. mark some resources as GC
	committer.(*CommitterImpl).MarkForGC(containerIDs[0], imageNames[0])
	committer.(*CommitterImpl).MarkForGC(containerIDs[1], imageNames[1])

	// 5. execute normal GC
	err = committer.(*CommitterImpl).normalGC(ctx)
	assert.NoError(t, err)

	// wait for gc
	time.Sleep(5 * time.Second)

	// 6. verify marked resources are cleaned up
	containers, err = committer.(*CommitterImpl).containerdClient.Containers(ctx)
	assert.NoError(t, err)
	fmt.Printf("=== Containers after normal GC ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
		// ensure marked containers are deleted
		assert.NotEqual(t, containerIDs[0], container.ID())
		assert.NotEqual(t, containerIDs[1], container.ID())
	}

	for i := 0; i < 2; i++ {
		devboxName := fmt.Sprintf("test-gc-devbox-%d-%d", time.Now().Unix(), i)
		contentID := fmt.Sprintf("test-gc-content-%d", i)
		commitImage := fmt.Sprintf("test-gc-image-%d-%d", time.Now().Unix(), i)

		containerID, err := committer.Commit(ctx, devboxName, contentID, baseImageBusyBox, commitImage)
		assert.NoError(t, err)
		containerIDs = append(containerIDs, containerID)
		imageNames = append(imageNames, commitImage)
	}

	containers, err = committer.(*CommitterImpl).containerdClient.Containers(ctx)
	assert.NoError(t, err)
	fmt.Printf("===After create 2 more containers ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}

	// 7. execute force GC
	err = committer.(*CommitterImpl).forceGC(ctx)
	assert.NoError(t, err)

	// 8. verify all resources are cleaned up
	containers, err = committer.(*CommitterImpl).containerdClient.Containers(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 0, len(containers), "All containers should be removed after force GC")
}

// test periodic GC
func TestPeriodicGC(t *testing.T) {
	ctx := context.Background()
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)

	// create committer
	committer, err := NewCommitter("", "", "")
	assert.NoError(t, err)
	err = committer.InitializeGC(ctx)
	assert.NoError(t, err)
	defer committer.(*CommitterImpl).Close()

	// 2. create some test resources
	var containerIDs []string
	var imageNames []string

	// create four test containers and images
	for i := 0; i < 4; i++ {
		devboxName := fmt.Sprintf("test-periodic-gc-devbox-%d-%d", time.Now().Unix(), i)
		contentID := fmt.Sprintf("test-periodic-gc-content-%d", i)
		commitImage := fmt.Sprintf("test-periodic-gc-image-%d-%d", time.Now().Unix(), i)

		containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, baseImageBusyBox)
		assert.NoError(t, err)
		containerIDs = append(containerIDs, containerID)
		imageNames = append(imageNames, commitImage)
	}

	// 4. mark some resources as GC
	committer.(*CommitterImpl).MarkForGC(containerIDs[0], imageNames[0])
	committer.(*CommitterImpl).MarkForGC(containerIDs[1], imageNames[1])

	// set short GC interval for test
	committer.(*CommitterImpl).gcInterval = 2 * time.Second
	// start GC
	err = committer.GC(ctx)
	assert.NoError(t, err)

	// wait for gc start
	fmt.Println("wait for gc start......")
	time.Sleep(3 * time.Second)
	containers, err := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	assert.NoError(t, err)
	fmt.Printf("=== Containers after first normal GC ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
		// ensure marked containers are deleted
		assert.NotEqual(t, containerIDs[0], container.ID())
		assert.NotEqual(t, containerIDs[1], container.ID())
	}

	committer.(*CommitterImpl).MarkForGC(containerIDs[2], imageNames[2])
	committer.(*CommitterImpl).MarkForGC(containerIDs[3], imageNames[3])
	// wait for gc start again
	fmt.Println("wait for gc start again......")
	time.Sleep(3 * time.Second)

	// verify resources are cleaned up
	containers, err = committer.(*CommitterImpl).containerdClient.Containers(ctx)
	assert.NoError(t, err)

	assert.Equal(t, 0, len(containers), "All containers should be removed by periodic GC")

	images, err := committer.(*CommitterImpl).containerdClient.ListImages(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 0, len(images), "All images should be removed by periodic GC")
}
