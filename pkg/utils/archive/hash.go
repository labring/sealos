package archive

import (
	"io"

	// in some env, there maybe a panic of crypto/sha256 is not imported
	_ "crypto/sha256"

	"github.com/opencontainers/go-digest"
)

const emptySHA256TarDigest = "sha256:5f70bf18a086007016e948b04aed3b82103a36bea41755b6cddfaf10ace3c6ef"

func canonicalDigest(reader io.ReadCloser) (digest.Digest, int64, error) {
	defer reader.Close()

	digester := digest.Canonical.Digester()
	size, err := io.Copy(digester.Hash(), reader)
	if err != nil {
		return "", 0, err
	}
	layerDigest := digester.Digest()
	if layerDigest == emptySHA256TarDigest {
		return "", 0, nil
	}

	return layerDigest, size, nil
}
