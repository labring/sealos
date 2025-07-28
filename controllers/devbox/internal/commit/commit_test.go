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

// const (
// 	testNamespace = "k8s.io"
// 	testAddress   = "/run/containerd/containerd.sock"
// 	testDataRoot  = "/var/lib/containerd"
// )

// init Committer
func TestNewCommitter(t *testing.T) {
	committer, err := NewCommitter()
	assert.NoError(t, err)
	assert.NotNil(t, committer)
}

// test commit flow
func TestCommitFlow(t *testing.T) {
	ctx:=context.Background()

	// 1. create committer
	committer,err:=NewCommitter()
	assert.NoError(t,err)

	// 2. prepare test data
	devboxName:=fmt.Sprintf("test-devbox-%d",time.Now().Unix())
	contentID:="test-content-id-123"
	baseImage:="docker.io/library/busybox:latest"
	commitImage:=fmt.Sprintf("test-devbox-commit-%d",time.Now().Unix())

	// 3. create container and commit container
	err=committer.Commit(ctx,devboxName,contentID,baseImage,commitImage)
	assert.NoError(t,err)

	// // 4. clean up
	// err=committer.(*CommitterImpl).DeleteContainer(ctx,containerID)
}

// test create container
func TestCreateContainer(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter()
	assert.NoError(t, err)

	// create container
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	contentID := "test-content-id-456"
	baseImage := "docker.io/library/nginx:latest"  // use another public image to test

	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, baseImage)
	assert.NoError(t, err)
	assert.NotEmpty(t, containerID)

	// // clean up
	// defer committer.(*CommitterImpl).DeleteContainer(ctx, containerID)

	// verify container labels
	annotations, err := committer.(*CommitterImpl).GetContainerAnnotations(ctx, containerID)
	assert.NoError(t, err)
	assert.Equal(t, contentID, annotations["devbox.sealos.io/content-id"])
}

// test delete container
func TestDeleteContainer(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter()
	assert.NoError(t, err)

	// create a container
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, "test-content-id-789", "docker.io/library/alpine:latest")
	assert.NoError(t, err)

	// show all containers in current namespace
	ctx = namespaces.WithNamespace(ctx, namespace)
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

// test error cases
func TestErrorCases(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter()
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
	// fmt.Println("=== 这是最新的测试代码 ===") 
	ctx := context.Background()
	committer, err := NewCommitter()
	assert.NoError(t, err)
	
	// concurrent to create container
	containerCount := 3
	wg:=sync.WaitGroup{}
	wg.Add(containerCount)
	var mu sync.Mutex
	containers:=make([]string,containerCount)
	// errChan := make(chan error, containerCount)
	// containerIDs := make(chan string, containerCount)
	// defer close(errChan)
	// defer close(containerIDs)

	for i := 0; i < containerCount; i++ {
		go func(index int) {
			defer wg.Done()
			devboxName := fmt.Sprintf("test-devbox-concurrent-%d-%d", time.Now().Unix(), index)
			containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, 
				fmt.Sprintf("test-content-id-%d", index), 
				"docker.io/library/busybox:latest")
			if err != nil {
				t.Errorf("Failed to create container: %v", err)
				return
			}
			mu.Lock()
			containers=append(containers,containerID)
			mu.Unlock()			
		}(i)
	}
	wg.Wait()

	// delete containers
	for _,containerID:=range containers{
		committer.(*CommitterImpl).DeleteContainer(ctx,containerID)
	}

	// get current containers list
	ctx = namespaces.WithNamespace(ctx, namespace)
	currentContainers, _ := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	fmt.Printf("=== All Containers in current namespace ===\n")
    for _, container := range currentContainers {
        // labels, _ := container.Labels(ctx)
        fmt.Printf("Container ID: %s\n", container.ID())
        // fmt.Printf("Labels: %+v\n", labels)
        // fmt.Printf("---\n")
    }
    fmt.Printf("=== Total %d containers ===\n", len(currentContainers))

}

// test gc handler
func TestGCHandler(t *testing.T) {
	// new Committer and GCHandler
	committer,err:=NewCommitter()
	require.NoError(t,err)
	gcHandler:=NewGcHandler(committer.(*CommitterImpl).containerdClient)

	// create 5 containers
	testCountainers:=[]struct{
		devboxName string
		contentID string
		baseImage string
	}{
		{"test-gc-devbox-1","test-gc-content-id-1","docker.io/library/busybox:latest"},
		{"test-gc-devbox-2","test-gc-content-id-2","docker.io/library/nginx:latest"},
		{"test-gc-devbox-3","test-gc-content-id-3","docker.io/library/alpine:latest"},
		{"test-gc-devbox-4","test-gc-content-id-4","docker.io/library/busybox:latest"},
		{"test-gc-devbox-5","test-gc-content-id-5","docker.io/library/nginx:latest"},
	}
	// createContainerIDs:=make([]string,0,len(testCountainers))
	for _,container:=range testCountainers{
		_,err:=committer.(*CommitterImpl).CreateContainer(context.Background(),container.devboxName,container.contentID,container.baseImage)
		require.NoError(t,err)
		// createContainerIDs=append(createContainerIDs,cID)
	}

	// show all containers before gc
	ctx := namespaces.WithNamespace(context.Background(), namespace)
	currentContainers, _ := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	fmt.Printf("=== All Containers before gc ===\n")
    for _, container := range currentContainers {
        // labels, _ := container.Labels(ctx)
        fmt.Printf("Container ID: %s\n", container.ID())
        // fmt.Printf("Labels: %+v\n", labels)
        // fmt.Printf("---\n")
    }
    fmt.Printf("=== Total %d containers ===\n", len(currentContainers))

	// gc: 
	err=gcHandler.GC(context.Background())
	require.NoError(t,err)

	// verify containers are deleted
	// get current containers list
	// ctx := namespaces.WithNamespace(context.Background(), namespace)
	afterContainers, _ := committer.(*CommitterImpl).containerdClient.Containers(ctx)
	fmt.Printf("=== All Containers after gc ===\n")
    for _, container := range afterContainers {
        // labels, _ := container.Labels(ctx)
        fmt.Printf("Container ID: %s\n", container.ID())
        // fmt.Printf("Labels: %+v\n", labels)
        // fmt.Printf("---\n")
    }
    fmt.Printf("=== Total %d containers ===\n", len(afterContainers))
}

// // 测试大镜像的处理
// func TestLargeImage(t *testing.T) {
// 	ctx := context.Background()
// 	committer, err := NewCommitter()
// 	assert.NoError(t, err)

// 	// 使用较大的镜像进行测试
// 	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
// 	contentID := "test-content-id-large"
// 	baseImage := "docker.io/library/tensorflow/tensorflow:latest"  // 大镜像
// 	commitImage := fmt.Sprintf("localhost:5000/test-large-commit-%d:latest", time.Now().Unix())

// 	// 创建容器
// 	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, baseImage)
// 	if err != nil {
// 		t.Logf("Skip large image test due to error: %v", err)
// 		t.Skip()
// 	}

// 	// Commit 容器
// 	err = committer.Commit(ctx, devboxName, contentID, baseImage, commitImage)
// 	assert.NoError(t, err)

// 	// 清理
// 	err = committer.(*CommitterImpl).DeleteContainer(ctx, containerID)
// 	assert.NoError(t, err)
// }