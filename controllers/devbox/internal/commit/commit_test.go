package commit

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	containerd "github.com/containerd/containerd/v2/client"
	"github.com/containerd/containerd/v2/core/containers"
	"github.com/containerd/containerd/v2/pkg/namespaces"
	"github.com/containerd/errdefs"
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
	committer, err := NewCommitter("", "", "", true)
	if err != nil {
		t.Fatalf("NewCommitter failed: %v", err)
	}
	assert.NotNil(t, committer)
}

// test commit flow
func TestCommitFlow(t *testing.T) {
	ctx := context.Background()

	// 1. create committer
	committer, err := NewCommitter("", "", "", true)
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
	committer, err := NewCommitter("", "", "", true)
	require.NoError(t, err)

	// create container
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	contentID := fmt.Sprintf("test-content-id-%d", time.Now().Unix())
	containerID, err := committer.
		CreateContainer(ctx, devboxName, contentID, baseImageNginx)
	require.NoError(t, err)

	// verify container labels
	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}
	var annotations map[string]string
	if annotations, err = committerImpl.GetContainerAnnotations(ctx, containerID); err != nil {
		t.Fatalf("GetContainerAnnotations failed: %v", err)
	}
	t.Logf("annotations: %+v", annotations)
}

// test delete container
func TestDeleteContainer(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "", true)
	assert.NoError(t, err)

	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}

	// create a container
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	var containerID string
	if containerID, err = committer.CreateContainer(ctx, devboxName, "test-content-id-789", baseImageAlpine); err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}

	// show all containers in current namespace
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	var containers []containerd.Container
	if containers, err = committerImpl.containerdClient.Containers(ctx); err != nil {
		t.Fatalf("Containers failed: %v", err)
	}

	fmt.Printf("=== All Containers in current namespace ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(containers))

	// delete container
	if err = committerImpl.DeleteContainer(ctx, containerID); err != nil {
		t.Fatalf("DeleteContainer failed: %v", err)
	}

	if containers, err = committerImpl.containerdClient.Containers(ctx); err != nil {
		t.Fatalf("Containers failed: %v", err)
	}

	fmt.Printf("=== All Containers in current namespace ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(containers))

	// verify container is deleted (try to get labels should return error)
	if _, err = committerImpl.GetContainerAnnotations(ctx, containerID); err == nil {
		t.Fatalf("expected error when getting annotations for deleted container")
	}
}

// test remove container
func TestRemoveContainer(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "", true)
	assert.NoError(t, err)

	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}

	// create a container
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	var containerID string
	if containerID, err = committer.CreateContainer(ctx, devboxName, "test-content-id-789", baseImageAlpine); err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}

	// show all containers in current namespace
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	var containers []containerd.Container
	if containers, err = committerImpl.containerdClient.Containers(ctx); err != nil {
		t.Fatalf("Containers failed: %v", err)
	}

	fmt.Printf("=== All Containers in current namespace ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(containers))

	// delete container
	if err = committer.RemoveContainers(ctx, []string{containerID}); err != nil {
		t.Fatalf("RemoveContainers failed: %v", err)
	}

	if containers, err = committerImpl.containerdClient.Containers(ctx); err != nil {
		t.Fatalf("Containers failed: %v", err)
	}

	fmt.Printf("=== All Containers in current namespace ===\n")
	for _, container := range containers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(containers))

	// verify container is deleted (try to get labels should return error)
	if _, err = committerImpl.GetContainerAnnotations(ctx, containerID); err == nil {
		t.Fatalf("expected error when getting annotations for removed container")
	}
}

// test error cases
func TestErrorCases(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "", true)
	assert.NoError(t, err)

	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}

	// test use not exist image to create container
	if _, err = committer.CreateContainer(ctx, "test-devbox", "test-content-id", "not-exist-image:latest"); err == nil {
		t.Fatalf("expected error when creating container with non-exist image")
	}

	// test use not exist container to delete
	if err = committerImpl.DeleteContainer(ctx, "not-exist-container"); err == nil {
		t.Fatalf("expected error when deleting non-exist container")
	}

	// test get not exist container label
	if _, err = committerImpl.GetContainerAnnotations(ctx, "not-exist-container"); err == nil {
		t.Fatalf("expected error when getting annotations of non-exist container")
	}
}

// test concurrent operations
func TestConcurrentOperations(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "", true)
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
			var containerID string
			var err error
			if containerID, err = committer.CreateContainer(ctx, devboxName,
				fmt.Sprintf("test-content-id-%d", index),
				baseImageBusyBox); err != nil {
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
		err := committer.RemoveContainers(ctx, []string{containerID})
		if err != nil {
			t.Logf("Warning: failed to delete container %s: %v", containerID, err)
		}
	}

	// get current containers list
	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	var currentContainers []containerd.Container
	if currentContainers, err = committerImpl.containerdClient.Containers(ctx); err != nil {
		t.Fatalf("Containers failed: %v", err)
	}
	fmt.Printf("=== All Containers in current namespace ===\n")
	for _, container := range currentContainers {
		fmt.Printf("Container ID: %s\n", container.ID())
	}
	fmt.Printf("=== Total %d containers ===\n", len(currentContainers))
}

// test runtime selection
func TestRuntimeSelection(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "", true)
	assert.NoError(t, err)

	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}

	// create container with specific runtime
	devboxName := fmt.Sprintf("test-runtime-%d", time.Now().Unix())
	contentID := "test-runtime-content-id"

	var containerID string
	if containerID, err = committer.CreateContainer(ctx, devboxName, contentID, baseImageBusyBox); err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}
	assert.NotEmpty(t, containerID)

	// get container info to verify runtime
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	var container containerd.Container
	if container, err = committerImpl.containerdClient.LoadContainer(ctx, containerID); err != nil {
		t.Fatalf("LoadContainer failed: %v", err)
	}

	var info containers.Container
	if info, err = container.Info(ctx); err != nil {
		t.Fatalf("container.Info failed: %v", err)
	}

	fmt.Printf("=== Container Runtime Information ===\n")
	fmt.Printf("Container ID: %s\n", containerID)
	fmt.Printf("Runtime Name: %s\n", info.Runtime.Name)
	fmt.Printf("Runtime Options: %+v\n", info.Runtime.Options)
	fmt.Printf("Expected Runtime: %s\n", DefaultRuntime)
	fmt.Printf("Runtime Match: %v\n", info.Runtime.Name == DefaultRuntime)

	// cleanup
	if err = committerImpl.DeleteContainer(ctx, containerID); err != nil {
		t.Fatalf("DeleteContainer failed: %v", err)
	}
}

// test connection management
func TestConnectionManagement(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "", true)
	assert.NoError(t, err)

	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}

	defer func() {
		if cerr := committerImpl.Close(); cerr != nil {
			t.Fatalf("Close failed: %v", cerr)
		}
	}()

	// test connection check
	if err = committerImpl.CheckConnection(ctx); err != nil {
		t.Fatalf("CheckConnection failed: %v", err)
	}

	// create container
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	contentID := "903b3c87-1458-4dd8-b0f4-9da7184cf8ca"
	testImage := "ghcr.io/labring-actions/devbox/go-1.23.0:13aacd8"
	var containerID string
	if containerID, err = committer.CreateContainer(ctx, devboxName, contentID, testImage); err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}
	assert.NotEmpty(t, containerID)

	// delete container
	if err = committer.RemoveContainers(ctx, []string{containerID}); err != nil {
		t.Fatalf("RemoveContainers failed: %v", err)
	}

	// test reconnect
	if err = committerImpl.Reconnect(ctx); err != nil {
		t.Fatalf("Reconnect failed: %v", err)
	}

	// create container again
	if containerID, err = committer.CreateContainer(ctx, devboxName, contentID, testImage); err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}
	assert.NotEmpty(t, containerID)

	// test connection check again
	if err = committerImpl.CheckConnection(ctx); err != nil {
		t.Fatalf("CheckConnection failed: %v", err)
	}

	if err = committer.RemoveContainers(ctx, []string{containerID}); err != nil {
		t.Fatalf("RemoveContainers failed: %v", err)
	}

	// test connection check again
	if err = committerImpl.CheckConnection(ctx); err != nil {
		t.Fatalf("CheckConnection failed: %v", err)
	}

	fmt.Printf("Connection management test passed\n")
}

// test push to Docker Hub
func TestPushToDockerHub(t *testing.T) {
	ctx := context.Background()

	// use test registry
	registryAddr := "docker.io"
	registryUser := "cunzili"
	registryPassword := "123456789"

	committer, err := NewCommitter(registryAddr, registryUser, registryPassword, true)
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
	err = committer.RemoveImages(ctx, []string{testImageName}, false, false)
	assert.NoError(t, err)

	// verify image is deleted
	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}
	if _, err = committerImpl.containerdClient.GetImage(ctx, testImageName); err == nil {
		t.Fatalf("expected error when getting deleted image")
	}
	fmt.Println("can not find image:", testImageName)

	// remove container
	if err = committerImpl.RemoveContainers(ctx, []string{containerID}); err != nil {
		t.Fatalf("RemoveContainers failed: %v", err)
	}

	// verify container is deleted
	if _, err = committerImpl.containerdClient.LoadContainer(ctx, containerID); err == nil {
		t.Fatalf("expected error when loading deleted container")
	}
	fmt.Println("can not find container:", containerID)
}

// test push without authentication
func TestPushWithoutAuth(t *testing.T) {
	ctx := context.Background()

	// no authentication
	registryAddr := "docker.io"
	registryUser := ""
	registryPassword := ""

	committer, err := NewCommitter(registryAddr, registryUser, registryPassword, true)
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
	committer, err := NewCommitter("", "", "", true)
	assert.NoError(t, err)

	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}

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
	if err = committer.RemoveImages(ctx, []string{imageName}, false, false); err != nil {
		t.Fatalf("RemoveImages failed: %v", err)
	}

	// verify image is deleted
	if _, err = committerImpl.containerdClient.GetImage(ctx, imageName); err == nil {
		t.Fatalf("expected error when getting deleted image")
	}
}

// TestAtomicLabels test containerd's atomic label update
func TestAtomicLabels(t *testing.T) {
	ctx := context.Background()
	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	committer, err := NewCommitter("", "", "", true)
	assert.NoError(t, err)

	// 1. create a test container
	devboxName := fmt.Sprintf("test-atomic-%d", time.Now().Unix())
	contentID := fmt.Sprintf("test-atomic-content-%d", time.Now().Unix())
	var containerID string
	if containerID, err = committer.CreateContainer(ctx, devboxName, contentID, baseImageBusyBox); err != nil {
		t.Fatalf("CreateContainer failed: %v", err)
	}

	// ensure cleanup container after test
	defer func() {
		if cleanupErr := committer.RemoveContainers(ctx, []string{containerID}); cleanupErr != nil {
			fmt.Printf("Failed to cleanup container: %v", cleanupErr)
		}
	}()

	// 2. get container object
	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}
	var container containerd.Container
	if container, err = committerImpl.containerdClient.LoadContainer(ctx, containerID); err != nil {
		t.Fatalf("LoadContainer failed: %v", err)
	}

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
	committer, err := NewCommitter("", "", "", true)
	assert.NoError(t, err)

	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}

	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)
	var images []containerd.Image
	if images, err = committerImpl.containerdClient.ListImages(ctx); err != nil {
		t.Fatalf("ListImages failed: %v", err)
	}
	for _, image := range images {
		fmt.Printf("Image ID: %s\n", image.Target().Digest.String())
	}
}

// TestRemoveImagePerformance test RemoveImage performance
func TestRemoveImagePerformance(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter("", "", "", true)
	assert.NoError(t, err)

	committerImpl, ok := committer.(*CommitterImpl)
	if !ok {
		t.Fatalf("failed to assert committer to CommitterImpl")
	}

	ctx = namespaces.WithNamespace(ctx, DefaultNamespace)

	fmt.Printf("\n====================================\n")
	fmt.Printf("image remove test\n")
	fmt.Printf("Namespace: %s\n", DefaultNamespace)
	fmt.Printf("====================================\n\n")

	// list all images
	var images []containerd.Image
	if images, err = committerImpl.containerdClient.ListImages(ctx); err != nil {
		t.Fatalf("ListImages failed: %v", err)
	}

	fmt.Printf("current image count: %d\n", len(images))
	if len(images) > 0 {
		fmt.Println("\nimage list:")
		for i, img := range images {
			fmt.Printf("  [%d] %s\n", i+1, img.Name())
			size, err := img.Size(ctx)
			if err == nil {
				fmt.Printf("      Size: %.2f MB\n", float64(size)/1024/1024)
			}
		}
	} else {
		fmt.Println("no image found, test finished")
		return
	}

	fmt.Printf("\n====================================\n")
	fmt.Printf("start to remove all images\n")
	fmt.Printf("====================================\n\n")

	// record each image remove result
	type RemoveResult struct {
		ImageName string
		Size      float64
		Duration  time.Duration
		Success   bool
		Error     error
	}

	results := make([]RemoveResult, 0, len(images))
	totalStart := time.Now()

	// remove all images
	for i, image := range images {
		imageName := image.Name()
		size, err := image.Size(ctx)
		sizeMB := float64(size) / 1024 / 1024

		if err != nil {
			fmt.Printf("[%d/%d] remove image: %s (size unknown, failed to get size: %v)\n", i+1, len(images), imageName, err)
		} else {
			fmt.Printf("[%d/%d] remove image: %s (%.2f MB)\n", i+1, len(images), imageName, sizeMB)
		}

		start := time.Now()
		err = committer.RemoveImages(ctx, []string{imageName}, true, false)
		duration := time.Since(start)

		result := RemoveResult{
			ImageName: imageName,
			Size:      sizeMB,
			Duration:  duration,
			Success:   err == nil,
			Error:     err,
		}
		results = append(results, result)

		if err != nil {
			fmt.Printf("  status: failed - %v\n", err)
		} else {
			fmt.Printf("  status: success\n")
		}
		fmt.Printf("  duration: %v (%.3f seconds)\n\n", duration, duration.Seconds())
	}

	totalDuration := time.Since(totalStart)

	// output statistics result
	fmt.Printf("====================================\n")
	fmt.Printf("remove statistics\n")
	fmt.Printf("====================================\n\n")

	successCount := 0
	failCount := 0
	for _, result := range results {
		if result.Success {
			successCount++
		} else {
			failCount++
		}
	}

	fmt.Printf("total image count: %d\n", len(images))
	fmt.Printf("success remove: %d\n", successCount)
	fmt.Printf("failed remove: %d\n", failCount)
	fmt.Printf("total duration: %v (%.3f seconds)\n\n", totalDuration, totalDuration.Seconds())

	// detailed statistics
	fmt.Println("each image remove duration:")
	fmt.Println("-----------------------------------")
	for i, result := range results {
		status := "✓"
		if !result.Success {
			status = "✗"
		}
		fmt.Printf("  [%d] %s %s\n", i+1, status, result.ImageName)
		fmt.Printf("      Size: %.2f MB\n", result.Size)
		fmt.Printf("      Time: %v (%.3f seconds)\n", result.Duration, result.Duration.Seconds())
		if !result.Success {
			fmt.Printf("      Error: %v\n", result.Error)
		}
	}

	// verify remove result
	fmt.Printf("\n====================================\n")
	fmt.Printf("verify remove result\n")
	fmt.Printf("====================================\n")
	var finalImages []containerd.Image
	if finalImages, err = committerImpl.containerdClient.ListImages(ctx); err != nil {
		t.Fatalf("ListImages failed: %v", err)
	}
	fmt.Printf("remaining image count after remove: %d\n", len(finalImages))

	if len(finalImages) > 0 {
		fmt.Println("\nremaining images:")
		for i, img := range finalImages {
			fmt.Printf("  [%d] %s\n", i+1, img.Name())
		}
	}

	fmt.Printf("\ntest finished!\n")
}
