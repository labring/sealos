package helper

const (
	DefaultContainerFSAvailableThreshold = 10
	DefaultCPURequestRatio               = 1
	DefaultCPULimitRatio                 = 2
	DefaultMemoryRequestRatio            = 1
	DefaultMemoryLimitRatio              = 2
)

type AcceptanceConsideration struct {
	// The percentage of available bytes required to consider the node suitable for scheduling devbox.
	// Default is 10, which means the node must have at least 10% of available bytes in the container filesystem.
	ContainerFSAvailableThreshold uint
	// The ratio of expected overcommitment (total cpu request / available cpu) of CPU request.
	// Default is 1, which means the CPU request cannot be overcommited by more than 100%.
	CPURequestRatio uint
	// The ratio of expected overcommitment (total cpu limit / available cpu) of CPU limit.
	// Default is 2, which means the CPU limit cannot be overcommited by more than 200%.
	CPULimitRatio uint
	// The ratio of expected overcommitment (total memory request / available memory) of Memory request.
	// Default is 1, which means the Memory request cannot be overcommited by more than 100%.
	MemoryRequestRatio uint
	// The ratio of expected overcommitment (total memory limit / available memory) of Memory limit.
	// Default is 2, which means the Memory limit cannot be overcommited by more than 200%.
	MemoryLimitRatio uint
}
