package stat

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// FsStats contains data about filesystem usage.
// This part of code is taken from k8s.io/kubelet/pkg/apis/stats/v1alpha1
// Maybe we should import it directly in the future.
type FsStats struct {
	// The time at which these stats were updated.
	Time metav1.Time `json:"time"`
	// AvailableBytes represents the storage space available (bytes) for the filesystem.
	// +optional
	AvailableBytes *uint64 `json:"availableBytes,omitempty"`
	// CapacityBytes represents the total capacity (bytes) of the filesystems underlying storage.
	// +optional
	CapacityBytes *uint64 `json:"capacityBytes,omitempty"`
	// UsedBytes represents the bytes used for a specific task on the filesystem.
	// This may differ from the total bytes used on the filesystem and may not equal CapacityBytes - AvailableBytes.
	// e.g. For ContainerStats.Rootfs this is the bytes used by the container rootfs on the filesystem.
	// +optional
	UsedBytes *uint64 `json:"usedBytes,omitempty"`
	// InodesFree represents the free inodes in the filesystem.
	// +optional
	InodesFree *uint64 `json:"inodesFree,omitempty"`
	// Inodes represents the total inodes in the filesystem.
	// +optional
	Inodes *uint64 `json:"inodes,omitempty"`
	// InodesUsed represents the inodes used by the filesystem
	// This may not equal Inodes - InodesFree because this filesystem may share inodes with other "filesystems"
	// e.g. For ContainerStats.Rootfs, this is the inodes used only by that container, and does not count inodes used by other containers.
	InodesUsed *uint64 `json:"inodesUsed,omitempty"`
}

type NodeStatsProvider interface {
	ContainerFsStats(ctx context.Context) (FsStats, error)
}
type NodeStatsProviderImpl struct {
	// Client *containerd.Client
}

func (n *NodeStatsProviderImpl) ContainerFsStats(ctx context.Context) (FsStats, error) {
	// This is a placeholder for the actual implementation.
	// In a real implementation, this would return the filesystem stats of the container.
	availableBytes := uint64(1000000000) // Example value
	capacityBytes := uint64(2000000000)  // Example value
	return FsStats{
		AvailableBytes: &availableBytes, // Example value
		CapacityBytes:  &capacityBytes,  // Example value
	}, nil
}
