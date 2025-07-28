package commit

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// const (
// 	testNamespace = "k8s.io"
// 	testAddress   = "/run/containerd/containerd.sock"
// 	testDataRoot  = "/var/lib/containerd"
// )

// 测试初始化 Committer
func TestNewCommitter(t *testing.T) {
	committer, err := NewCommitter()
	assert.NoError(t, err)
	assert.NotNil(t, committer)
}

// 测试完整的 commit 流程
func TestCommitFlow(t *testing.T) {
	ctx:=context.Background()

	// 1. 创建 committer
	committer,err:=NewCommitter()
	assert.NoError(t,err)

	// 2. 准备测试数据
	devboxName:=fmt.Sprintf("test-devbox-%d",time.Now().Unix())
	contentID:="test-content-id-123"
	baseImage:="docker.io/library/busybox:latest"
	commitImage:=fmt.Sprintf("test-commit-%d",time.Now().Unix())

	// 3. 创建容器并且commit容器
	err=committer.Commit(ctx,devboxName,contentID,baseImage,commitImage)
	assert.NoError(t,err)

	// // 4. 清理
	// err=committer.(*CommitterImpl).DeleteContainer(ctx,containerID)
}

// 测试创建容器
func TestCreateContainer(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter()
	assert.NoError(t, err)

	// 创建容器
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	contentID := "test-content-id-456"
	baseImage := "docker.io/library/nginx:latest"  // 使用另一个公共镜像测试

	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, baseImage)
	assert.NoError(t, err)
	assert.NotEmpty(t, containerID)

	// 清理
	defer committer.(*CommitterImpl).DeleteContainer(ctx, containerID)

	// 验证容器标签
	annotations, err := committer.(*CommitterImpl).GetContainerAnnotations(ctx, containerID)
	assert.NoError(t, err)
	assert.Equal(t, contentID, annotations["devbox.sealos.io/content-id"])
}

// 测试删除容器
func TestDeleteContainer(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter()
	assert.NoError(t, err)

	// 先创建一个容器
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, "test-content-id-789", "docker.io/library/alpine:latest")
	assert.NoError(t, err)

	// 删除容器
	err = committer.(*CommitterImpl).DeleteContainer(ctx, containerID)
	assert.NoError(t, err)

	// 验证容器已删除（尝试获取标签应该返回错误）
	_, err = committer.(*CommitterImpl).GetContainerAnnotations(ctx, containerID)
	assert.Error(t, err)
}

// 测试错误情况
func TestErrorCases(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter()
	assert.NoError(t, err)

	// 测试使用不存在的镜像
	_, err = committer.(*CommitterImpl).CreateContainer(ctx, "test-devbox", "test-content-id", "not-exist-image:latest")
	assert.Error(t, err)

	// 测试删除不存在的容器
	err = committer.(*CommitterImpl).DeleteContainer(ctx, "not-exist-container")
	assert.Error(t, err)

	// 测试获取不存在容器的标签
	_, err = committer.(*CommitterImpl).GetContainerAnnotations(ctx, "not-exist-container")
	assert.Error(t, err)
}

// 测试并发操作
func TestConcurrentOperations(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter()
	assert.NoError(t, err)

	// 并发创建多个容器
	containerCount := 3
	errChan := make(chan error, containerCount)
	containerIDs := make(chan string, containerCount)

	for i := 0; i < containerCount; i++ {
		go func(index int) {
			devboxName := fmt.Sprintf("test-devbox-concurrent-%d-%d", time.Now().Unix(), index)
			containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, 
				fmt.Sprintf("test-content-id-%d", index), 
				"docker.io/library/busybox:latest")
			if err != nil {
				errChan <- err
				return
			}
			containerIDs <- containerID
		}(i)
	}

	// 收集结果
	for i := 0; i < containerCount; i++ {
		select {
		case err := <-errChan:
			assert.NoError(t, err)
		case containerID := <-containerIDs:
			// 清理创建的容器
			err := committer.(*CommitterImpl).DeleteContainer(ctx, containerID)
			assert.NoError(t, err)
		}
	}
}

// 测试大镜像的处理
func TestLargeImage(t *testing.T) {
	ctx := context.Background()
	committer, err := NewCommitter()
	assert.NoError(t, err)

	// 使用较大的镜像进行测试
	devboxName := fmt.Sprintf("test-devbox-%d", time.Now().Unix())
	contentID := "test-content-id-large"
	baseImage := "docker.io/library/tensorflow/tensorflow:latest"  // 大镜像
	commitImage := fmt.Sprintf("localhost:5000/test-large-commit-%d:latest", time.Now().Unix())

	// 创建容器
	containerID, err := committer.(*CommitterImpl).CreateContainer(ctx, devboxName, contentID, baseImage)
	if err != nil {
		t.Logf("Skip large image test due to error: %v", err)
		t.Skip()
	}

	// Commit 容器
	err = committer.Commit(ctx, devboxName, contentID, baseImage, commitImage)
	assert.NoError(t, err)

	// 清理
	err = committer.(*CommitterImpl).DeleteContainer(ctx, containerID)
	assert.NoError(t, err)
}