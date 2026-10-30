// Copyright © 2026 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package clusterfile

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/labring/sealos/pkg/constants"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	clientset "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

const (
	// LifecycleResource and LifecycleFilename are the recovery journal of the
	// pre-authority standalone lifecycle. Current versions never write them;
	// they remain defined so stale records from older inventories can be
	// detected and discarded, and so readers keep guarding against them.
	LifecycleResource = "sealos-standalone-lifecycle"
	LifecycleFilename = "standalone-lifecycle.json"
)

// CheckLifecycle keeps guarding commands that must not interleave with a
// journal left behind by an older inventory.
func CheckLifecycle(ctx context.Context, client clientset.Interface) error {
	_, err := client.CoreV1().
		ConfigMaps("kube-system").
		Get(ctx, LifecycleResource, metav1.GetOptions{})
	if err == nil {
		return fmt.Errorf(
			"%w; resume the pending standalone lifecycle operation",
			ErrModeTransitionPending,
		)
	}
	if !apierrors.IsNotFound(err) {
		return err
	}
	return nil
}

// DiscardLifecycleJournal removes a recovery journal left behind by an older
// inventory. The Clusterfile is the authoritative record now, so the journal
// is stale by definition; removal is best effort and must not block recovery.
func DiscardLifecycleJournal(ctx context.Context, name string) {
	path := filepath.Join(constants.ClusterDir(name), LifecycleFilename)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return
	}
	if err := os.Remove(path); err != nil {
		return
	}
	config, err := clientcmd.BuildConfigFromFlags(
		"",
		constants.NewPathResolver(name).AdminFile(),
	)
	if err != nil {
		return
	}
	config.Timeout = 10 * time.Second
	client, err := clientset.NewForConfig(config)
	if err != nil {
		return
	}
	_ = client.CoreV1().
		ConfigMaps("kube-system").
		Delete(ctx, LifecycleResource, metav1.DeleteOptions{})
}
