// Copyright © 2023 sealos.
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

package controllers

import (
	"context"
	"fmt"
	"testing"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"

	controllerruntime "sigs.k8s.io/controller-runtime"
)

func BenchmarkNewMonitorReconciler(b *testing.B) {
	// 1. 初始化 MonitorReconciler 和 Kubernetes client
	m := &MonitorReconciler{}
	cfg, err := controllerruntime.GetConfig()
	if err != nil {
		b.Fatal(fmt.Errorf("failed to get kubernetes config: %v", err))
	}
	m.Client, err = client.New(cfg, client.Options{Scheme: scheme.Scheme})
	if err != nil {
		b.Fatal(fmt.Errorf("failed to create kubernetes client: %v", err))
	}
	m.initNamespaceFuncs()

	// 2. 列出所有命名空间
	ctx := context.Background()
	namespaceList := &corev1.NamespaceList{}
	if err := m.Client.List(ctx, namespaceList); err != nil {
		b.Fatal(err, "failed to list namespaces")
	}

	// 3. 基准测试
	b.ResetTimer() // 重置计时器
	for i := 0; i < 1; i++ {
		if err := m.processNamespaceList(ctx, namespaceList); err != nil {
			b.Fatal(err, "failed to process namespace list")
		}
	}
}
