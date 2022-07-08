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

package utils

import (
	"testing"
)

var out = `sha256:503c32544eaf03bc342403402ca352a513a32667d94d7d97233eb2088660461f
sha256:34b133ff3e13fad05b5de722b7b9285691a3e744d6b309fed936be0a39701afa
sha256:4b0c206d4b27d08bb645c1170d6228d83996f340a7f02c4eb0f45d9c680a0766
sha256:2519b81f5b8fb8d0b04659c095ff97f352efbdf80e6d4f66afd6c1c8858be1d3
sha256:2c8ece7be86a45cef0e4c3c65c9800d8adb7339a55445444e669f1fe109abe7d
sha256:f77d0235ad5cf1c45a7e0534c121476870cee557b4186d4ccc8044acaa2e663d
sha256:2a8ef6985a3e5aa0ef07b233fdc57ea2070bc151f89fcee8f98a31d5da3c0a21
sha256:7a71aca7b60fcb933d5f8e30e17fde66c4d1ff8a963bfde1ee0c43d5a4ed577d
sha256:17300d20daf937a5636197d088d3eaec39721018012c3cc16f92bf61e82ed20f
sha256:8d147537fb7d1ac8895da4d55a5e53621949981e2e6460976dae812f83d84a44
sha256:0048118155842e4c91f0498dd298b8e93dc3aecc7052d9882b76f48e311a76ba
sha256:c0d565df2c900c1994f150a1630b3ce4c4256ad479ca6520ad13e75f8082e5a9
sha256:41ff053508988530b20d20ed4dec4eb43607a4b0d8b0408400a8dd5853110eeb
sha256:c1cfbd59f774775b99fbc0c4cecc211089c2b1f1277088af7c16d5b10bc607bc
sha256:398b2c18375df4ed5fb40030e33e9f6c010f9974e65040577b718eba4ccb9a29
sha256:6bf6d481d77e8c65754ca3e637b3c2b237710775c19434c2f0a829a8b8e5b8f0
sha256:ed210e3e4a5bae1237f1bb44d72a05a2f1e5c6bfe7a7e73da179e2534269c459`

func TestHTTP(t *testing.T) {
	IsImageID(out, "7a71aca7b60fc")
}
