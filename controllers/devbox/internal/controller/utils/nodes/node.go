package nodes

import (
	"os"
)

func GetNodeName() string {
	nodeName := os.Getenv("NODE_NAME")
	if nodeName == "" {
		// panic if node name is not set
		panic("NODE_NAME is not set")
	}
	return nodeName
}
