/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
	"os"
	"os/exec"
	"sync"

	"github.com/labring/sealos/pkg/utils/logger"
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
