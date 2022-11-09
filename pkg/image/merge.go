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

package image

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path"
	"strings"
	"text/template"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/image/types"
	"github.com/labring/sealos/pkg/types/v1beta1"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
	"github.com/labring/sealos/pkg/utils/rand"
)

func Merge(newImageName string, images []string, buildOptions *types.BuildOptions, policy string) error {
	registrySvc, err := NewRegistryService()
	if err != nil {
		return err
	}

	clusterSvc, err := NewClusterService()
	if err != nil {
		return err
	}
	imageSvc, err := NewImageService()
	if err != nil {
		return err
	}
	mergeDir, err := fileutil.MkTmpdir("")
	if err != nil {
		return err
	}
	logger.Debug("mergeDir: %s", mergeDir)
	var containerNames []string
	eg, _ := errgroup.WithContext(context.Background())
	for _, v := range images {
		imageName := strings.TrimSpace(v)
		if imageName == "" {
			continue
		}
		eg.Go(func() error {
			err = registrySvc.Pull(types.DefaultPlatform(), policy, imageName)
			if err != nil {
				return err
			}
			cName := fmt.Sprintf("%s-%s", imageName, rand.Generator(8))
			var manifest *types.ClusterManifest
			if manifest, err = clusterSvc.Create(cName, imageName); err != nil {
				logger.Warn("container create failed: %+v", err)
				return err
			}
			containerNames = append(containerNames, manifest.Container)
			_ = fileutil.RecursionCopy(manifest.MountPoint, mergeDir)
			return nil
		})
	}
	if err = eg.Wait(); err != nil {
		return err
	}

	defer func() {
		for _, i := range containerNames {
			_ = clusterSvc.Delete(i)
		}
		_ = os.RemoveAll(mergeDir)
	}()

	ociList, err := imageSvc.Inspect(images...)
	if err != nil {
		return err
	}
	dockerfile, err := mergeMountPath(ociList, images...)
	if err != nil {
		return err
	}
	err = os.WriteFile(path.Join(mergeDir, "Kubefile"), []byte(dockerfile), 0755)
	if err != nil {
		return err
	}
	buildOptions.File = path.Join(mergeDir, "Kubefile")
	buildOptions.SaveImage = false
	buildOptions.Tag = newImageName
	logger.Debug("buildOptions file: %s", buildOptions.File)
	logger.Debug("buildOptions tag: %s", newImageName)
	logger.Debug("buildOptions contextDir: %s", mergeDir)
	return imageSvc.Build(buildOptions, mergeDir, buildOptions.Tag)
}
func mergeMountPath(ociList types.ImageListOCIV1, images ...string) (string, error) {
	var labels map[string]string
	var envs map[string]string
	var cmds []string
	var entrypoints []string
	var isRootfs bool
	for _, oci := range ociList {
		labels = maps.MergeMap(labels, oci.Config.Labels)
		if oci.Config.Labels != nil && oci.Config.Labels[constants.ImageTypeKey] == string(v1beta1.RootfsImage) {
			isRootfs = true
		}
		envs = maps.MergeMap(envs, maps.ListToMap(oci.Config.Env))
		cmds = append(cmds, oci.Config.Cmd...)
		entrypoints = append(entrypoints, oci.Config.Entrypoint...)
	}
	delete(envs, "PATH")
	if isRootfs {
		labels[constants.ImageTypeKey] = string(v1beta1.RootfsImage)
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
		"Images":      images,
	}

	out := bytes.NewBuffer(nil)
	err = t.Execute(out, data)
	if err != nil {
		return "", err
	}
	return out.String(), nil
}
