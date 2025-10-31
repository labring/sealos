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

package bootstrap

type Applier interface {
	Filter(ctx Context, phase string) bool
	Apply(ctx Context, phase string) error
	Undo(ctx Context, phase string) error
}

type common struct{}

func (c *common) Filter(_ Context, _ string) bool { return true }
func (c *common) Apply(_ Context, _ string) error { return nil }
func (c *common) Undo(_ Context, _ string) error  { return nil }

var (
	defaultPreflights   []Applier
	defaultInitializers []Applier
	defaultPostflights  []Applier
)
