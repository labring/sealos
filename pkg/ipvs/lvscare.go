// Copyright © 2021 sealos.
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

package ipvs

import (
	"strings"

	"github.com/fanux/sealos/pkg/utils/logger"

	"github.com/fanux/sealos/pkg/types/contants"

	"github.com/pkg/errors"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/scheme"
)

const (
	LvsCareStaticPodName = "kube-sealyun-lvscare"
	LvsCareCommand       = "/usr/bin/lvscare"
)

func LvsStaticPodYaml(vip string, masters []string, image string) string {
	if vip == "" || len(masters) == 0 {
		return ""
	}
	if image == "" {
		image = contants.DefaultLvsCareImage
	}
	args := []string{"care", "--vs", vip + ":6443", "--health-path", "/healthz", "--health-schem", "https"}
	for _, m := range masters {
		if strings.Contains(m, ":") {
			m = strings.Split(m, ":")[0]
		}
		args = append(args, "--rs")
		args = append(args, m+":6443")
	}
	flag := true
	pod := componentPod(v1.Container{
		Name:            LvsCareStaticPodName,
		Image:           image,
		Command:         []string{LvsCareCommand},
		Args:            args,
		ImagePullPolicy: v1.PullIfNotPresent,
		SecurityContext: &v1.SecurityContext{Privileged: &flag},
	})
	yaml, err := podToYaml(pod)
	if err != nil {
		logger.Error("decode lvs care static pod yaml failed %s", err)
		return ""
	}
	return string(yaml)
}

func podToYaml(pod v1.Pod) ([]byte, error) {
	codecs := scheme.Codecs
	gv := v1.SchemeGroupVersion
	const mediaType = runtime.ContentTypeYAML
	info, ok := runtime.SerializerInfoForMediaType(codecs.SupportedMediaTypes(), mediaType)
	if !ok {
		return []byte{}, errors.Errorf("unsupported media type %q", mediaType)
	}

	encoder := codecs.EncoderForVersion(info.Serializer, gv)
	return runtime.Encode(encoder, &pod)
}

// componentPod returns a Pod object from the container and volume specifications
func componentPod(container v1.Container) v1.Pod {
	hostPathType := v1.HostPathUnset
	mountName := "lib-modules"
	volumes := []v1.Volume{
		{Name: mountName, VolumeSource: v1.VolumeSource{
			HostPath: &v1.HostPathVolumeSource{
				Path: "/lib/modules",
				Type: &hostPathType,
			},
		}},
	}
	container.VolumeMounts = []v1.VolumeMount{
		{Name: mountName, ReadOnly: true, MountPath: "/lib/modules"},
	}

	return v1.Pod{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Pod",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      container.Name,
			Namespace: metav1.NamespaceSystem,
		},
		Spec: v1.PodSpec{
			Containers:  []v1.Container{container},
			HostNetwork: true,
			Volumes:     volumes,
		},
	}
}
