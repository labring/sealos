// Copyright © 2022 sealos.
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

// This file content is extracted from "github.com/docker/docker/pkg/system"

package archive

const (
	// WhiteoutPrefix means this file is a whiteout(deleted at the merge layer)
	WhiteoutPrefix = ".wh."

	// WhiteoutMetaPrefix prefix means whiteout has a special meaning and is not
	// for removing an actual file. Normally these files are excluded from exported
	// archives.
	WhiteoutMetaPrefix = WhiteoutPrefix + WhiteoutPrefix

	// WhiteoutLinkDir is a directory AUFS uses for storing hardlink links to other
	// layers. Normally these should not go into exported archives and all changed
	// hardlinks should be copied to the top layer.
	WhiteoutLinkDir = WhiteoutMetaPrefix + "plnk"

	// WhiteoutOpaqueDir file means directory has been made opaque - meaning
	// readdir calls to this directory do not follow to lower layers.
	WhiteoutOpaqueDir = WhiteoutMetaPrefix + ".opq"
)
