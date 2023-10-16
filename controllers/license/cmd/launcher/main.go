package main

import (
	"os"
	"os/exec"
	"sync"

	"github.com/labring/sealos/controllers/pkg/utils/logger"
)

func main() {
	launch("/preset", "/manager")
}

func run(path string) error {
	// nosemgrep: go.lang.security.audit.dangerous-exec-command.dangerous-exec-command
	cmd := exec.Command(path)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func launch(path ...string) {
	var wg sync.WaitGroup
	for _, p := range path {
		wg.Add(1)
		go func(p string) {
			defer wg.Done()
			if err := run(p); err != nil {
				logger.Error(err, "Failed to run "+p)
			}
		}(p)
	}
	wg.Wait()
}
