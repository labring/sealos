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
