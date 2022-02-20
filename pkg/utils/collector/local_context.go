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

package collector

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/fanux/sealos/pkg/utils/logger"

	fsutil "github.com/tonistiigi/fsutil/copy"
)

type localCollector struct {
}

func (l localCollector) Collect(buildContext, src, savePath string) error {
	xattrErrorHandler := func(dst, src, key string, err error) error {
		logger.Warn(err)
		return nil
	}
	opt := []fsutil.Opt{
		fsutil.WithXAttrErrorHandler(xattrErrorHandler),
	}

	m, err := fsutil.ResolveWildcards(buildContext, src, true)
	if err != nil {
		return err
	}

	if len(m) == 0 {
		return fmt.Errorf("%s not found", src)
	}
	for _, s := range m {
		if err := fsutil.Copy(context.TODO(), buildContext, s, savePath, filepath.Base(s), opt...); err != nil {
			return err
		}
	}
	return nil
}

func NewLocalCollector() Collector {
	return localCollector{}
}
