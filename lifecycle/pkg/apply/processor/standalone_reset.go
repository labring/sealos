// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package processor

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

const StandaloneResetProgressFile = "standalone-reset-progress.json"

func runStandaloneResetPipeline(cluster *v2.Cluster, pipeline []func(*v2.Cluster) error) error {
	path := filepath.Join(constants.ClusterDir(cluster.Name), StandaloneResetProgressFile)
	var progress struct {
		Version   int `json:"Version"`
		Completed int `json:"Completed"`
	}
	data, err := os.ReadFile(path)
	if err == nil {
		if err := json.Unmarshal(data, &progress); err != nil {
			return err
		}
		if progress.Version != 1 || progress.Completed < 0 || progress.Completed > len(pipeline) {
			return errors.New("invalid standalone reset pipeline journal")
		}
	} else if !os.IsNotExist(err) {
		return err
	}
	progress.Version = 1
	for index := progress.Completed; index < len(pipeline); index++ {
		if err := pipeline[index](cluster); err != nil {
			return err
		}
		progress.Completed = index + 1
		if err := clusterfile.WriteMaintenanceJSON(path, progress); err != nil {
			return err
		}
	}
	return nil
}
