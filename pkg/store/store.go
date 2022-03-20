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

package store

import (
	"errors"
	"fmt"
	"os"
	"path"
	"path/filepath"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/archive"
	"github.com/fanux/sealos/pkg/utils/collector"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/hash"
	jlib "github.com/fanux/sealos/pkg/utils/json"
	"github.com/fanux/sealos/pkg/utils/logger"
	"k8s.io/apimachinery/pkg/util/json"
)

type Store interface {
	Save(p *v1beta1.Resource) error
}

type store struct {
	clusterName string
	contants.Data
}

func (s *store) Save(p *v1beta1.Resource) error {
	if p.Spec.Path == "" {
		return errors.New("package path not allow empty")
	}
	if p.Spec.Type.IsTarGz() {
		return s.tarGz(p)
	}
	return s.dir(p)
}

func (s *store) tarGz(p *v1beta1.Resource) error {
	err := collector.Download(p.Spec.Path, contants.TmpPath())
	if err != nil {
		return err
	}

	tarFileAbs := filepath.Join(contants.TmpPath(), file.Filename(p.Spec.Path))
	defer func() {
		if err = file.CleanFiles(tarFileAbs); err != nil {
			logger.Warn("failed to clean file: %s", err.Error())
		}
	}()
	md5 := hash.FileMD5(tarFileAbs)
	md5Dir := filepath.Join(contants.ResourcePath(), md5)
	err = file.Mkdir(md5Dir)
	if err != nil {
		return err
	}
	fileNameAbsReadIO, err := os.Open(filepath.Clean(tarFileAbs))
	if err != nil {
		return err
	}
	defer func() {
		if err = fileNameAbsReadIO.Close(); err != nil {
			logger.Fatal("failed to close file")
		}
	}()

	newArchive := archive.NewArchive(true, true)
	_, err = newArchive.UnTarOrGzip(fileNameAbsReadIO, md5Dir)
	if err != nil {
		return err
	}
	err = s.loadMetadata(p, md5Dir)
	if err != nil {
		return err
	}
	return nil
}
func (s *store) dir(p *v1beta1.Resource) error {
	arch := archive.NewArchive(false, false)
	digest, _, err := arch.Digest(p.Spec.Path)
	if err != nil {
		return err
	}
	md5Dir := path.Join(contants.ResourcePath(), digest.String())
	err = collector.Download(p.Spec.Path, md5Dir)
	if err != nil {
		return err
	}
	err = s.loadMetadata(p, md5Dir)
	if err != nil {
		return err
	}
	return nil
}

func (s *store) loadMetadata(p *v1beta1.Resource, md5Dir string) error {
	p.Status.Path = md5Dir

	metadata, err := jlib.Unmarshal(filepath.Join(md5Dir, contants.DataDirName, contants.MetadataFile))
	if err != nil {
		return err
	}

	if version, ok, _ := unstructured.NestedString(metadata, "version"); ok {
		p.Status.Version = fmt.Sprintf("%+v", version)
	} else {
		p.Status.Version = v1beta1.DefaultVersion
	}

	if arch, ok, _ := unstructured.NestedString(metadata, "arch"); ok {
		p.Status.Arch = v1beta1.Arch(fmt.Sprintf("%+v", arch))
	} else {
		p.Status.Arch = v1beta1.AMD64
	}

	if cni, ok, _ := unstructured.NestedString(metadata, "cni"); ok {
		p.Status.CNI = cni
	} else {
		p.Status.CNI = contants.DefaultCNI
	}

	if image, ok, _ := unstructured.NestedString(metadata, "image"); ok {
		p.Status.Image = image
	} else {
		p.Status.Image = contants.DefaultLvsCareImage
	}

	defaultPath := filepath.Join(md5Dir, contants.DataDirName, "scripts", "default.json")
	if file.IsExist(defaultPath) {
		defaultData, err := file.ReadAll(defaultPath)
		if err != nil {
			return err
		}
		var data map[string]string
		err = json.Unmarshal(defaultData, &data)
		if err != nil {
			return err
		}
		if data != nil {
			p.Status.Data = data
		}
	}
	return nil
}

func NewStore(clusterName string) Store {
	return &store{
		clusterName: clusterName,
		Data:        contants.NewData(clusterName),
	}
}
