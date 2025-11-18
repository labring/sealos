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

package clusterid

import (
	"context"
	"errors"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func GetClusterID(ctx context.Context, config *rest.Config) (string, error) {
	ns := &corev1.Namespace{}
	c, err := client.New(config, client.Options{})
	if err != nil {
		return "", err
	}
	err = c.Get(ctx, client.ObjectKey{Name: "kube-system"}, ns)
	if err != nil {
		return "", err
	}
	res := string(ns.UID)
	if res == "" || len(res) < 8 {
		return "", errors.New("failed to get cluster id")
	}
	return res[0:8], nil
}

func GetClusterCreateTime(ctx context.Context, config *rest.Config) (*metav1.Time, error) {
	ns := &corev1.Namespace{}
	c, err := client.New(config, client.Options{})
	if err != nil {
		return nil, err
	}
	err = c.Get(ctx, client.ObjectKey{Name: "kube-system"}, ns)
	if err != nil {
		return nil, err
	}
	res := ns.GetCreationTimestamp()
	if res.IsZero() {
		return nil, errors.New("failed to get create time")
	}
	return &res, nil
}
