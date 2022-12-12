/*
Copyright 2022 cuisongliu@qq.com.

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

package buildah

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"bytes"
	"context"
	"fmt"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/rand"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"golang.org/x/sync/errgroup"
	"os"
	"path"
	"strings"
	"text/template"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/maps"
)

func preMerge(newImageName string, images []string) error {
	mergeDir, err := fileutil.MkTmpdir("")
	if err != nil {
		return err
	}
	logger.Debug("mergeDir: %s", mergeDir)
	var containerNames []string
	eg, _ := errgroup.WithContext(context.Background())
	b, err := New("")
	if err != nil {
		return err
	}
	for _, v := range images {
		imageName := strings.TrimSpace(v)
		if imageName == "" {
			continue
		}
		eg.Go(func() error {
			err = b.Pull(DefaultPlatform(), imageName)
			if err != nil {
				return err
			}
			cName := fmt.Sprintf("%s-%s", imageName, rand.Generator(8))
			if m, err := b.Create(cName, imageName); err != nil {
				logger.Warn("container create failed: %+v", err)
				return err
			} else {
				containerNames = append(containerNames, m.ContainerID)
				_ = fileutil.RecursionCopy(m.MountPoint, mergeDir)
				return nil
			}
		})
	}
	if err = eg.Wait(); err != nil {
		return err
	}

	defer func() {
		for _, i := range containerNames {
			_ = b.Delete(i)
		}
		_ = os.RemoveAll(mergeDir)
	}()

	imageObjList := make([]v1.Image, 0)

	for _, i := range images {
		obj, err := b.InspectImage(i)
		if err != nil {
			return err
		}
		imageObjList = append(imageObjList, obj)
	}

	dockerfile, err := mergeMountPath(imageObjList, images...)
	if err != nil {
		return err
	}
	err = os.WriteFile(path.Join(mergeDir, "Kubefile"), []byte(dockerfile), 0755)
	if err != nil {
		return err
	}
	logger.Debug("buildOptions file: %s", path.Join(mergeDir, "Kubefile"))
	logger.Debug("buildOptions tag: %s", newImageName)
	logger.Debug("buildOptions contextDir: %s", mergeDir)
	return nil
}
func mergeMountPath(imageObjList []v1.Image, imageNames ...string) (string, error) {
	var labels map[string]string
	var envs map[string]string
	var cmds []string
	var entrypoints []string
	var isRootfs bool
	for _, oci := range imageObjList {
		labels = maps.MergeMap(labels, oci.Config.Labels)
		if oci.Config.Labels != nil && oci.Config.Labels[v1beta1.ImageTypeKey] == string(v1beta1.RootfsImage) {
			isRootfs = true
		}
		envs = maps.MergeMap(envs, maps.ListToMap(oci.Config.Env))
		cmds = append(cmds, oci.Config.Cmd...)
		entrypoints = append(entrypoints, oci.Config.Entrypoint...)
	}
	delete(envs, "PATH")
	if isRootfs {
		labels[v1beta1.ImageTypeKey] = string(v1beta1.RootfsImage)
	}
	for i, label := range labels {
		labels[i] = "\"" + strings.ReplaceAll(label, "$", "\\$") + "\""
	}
	for i, entrypoint := range entrypoints {
		entrypoints[i] = "\"" + strings.ReplaceAll(entrypoint, "$", "\\$") + "\""
	}
	for i, cmd := range cmds {
		cmds[i] = "\"" + strings.ReplaceAll(cmd, "$", "\\$") + "\""
	}
	t := template.New("")
	t, err := t.Parse(
		`FROM scratch
MAINTAINER labring
{{- if .Labels }}
{{- range $key, $val := .Labels }}
LABEL {{ $key }}={{ $val }}
{{- end }}
{{- end }}
{{- if .Envs }}
{{- range $key, $val := .Envs }}
ENV {{ $key }}={{ $val }}
{{- end }}
{{- end }}
{{- if .Entrypoints }}
ENTRYPOINT [{{ .Entrypoints }}]
{{- end }}
{{- if .CMDs }}
CMD [{{ .CMDs }}]
{{- end }}
{{- if .Images }}
{{- range .Images }}
COPY --from={{.}}  . .
{{- end }}
{{- end }}`)
	if err != nil {
		return "", err
	}
	data := map[string]any{
		"Labels":      labels,
		"Envs":        envs,
		"Entrypoints": strings.Join(entrypoints, ","),
		"CMDs":        strings.Join(cmds, ","),
		"Images":      imageNames,
	}

	out := bytes.NewBuffer(nil)
	err = t.Execute(out, data)
	if err != nil {
		return "", err
	}
	return out.String(), nil
}
