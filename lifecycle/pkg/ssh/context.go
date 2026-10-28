// Copyright © 2026 sealos.
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

package ssh

import "context"

// WithContext binds every operation to ctx without changing the shared client.
// Transports implement WithContext to cancel in-flight I/O as well as dispatch.
func WithContext(ctx context.Context, client Interface) Interface {
	if transport, ok := client.(interface {
		WithContext(ctx context.Context) Interface
	}); ok {
		client = transport.WithContext(ctx)
	}
	return &contextClient{Interface: client, ctx: ctx}
}

type contextClient struct {
	Interface
	ctx context.Context
}

func (c *contextClient) Ping(host string) error {
	if err := c.ctx.Err(); err != nil {
		return err
	}
	return c.Interface.Ping(host)
}

func (c *contextClient) Copy(host, source, target string) error {
	if err := c.ctx.Err(); err != nil {
		return err
	}
	return c.Interface.Copy(host, source, target)
}

func (c *contextClient) Fetch(host, source, target string) error {
	if err := c.ctx.Err(); err != nil {
		return err
	}
	return c.Interface.Fetch(host, source, target)
}

func (c *contextClient) Cmd(host, command string) ([]byte, error) {
	if err := c.ctx.Err(); err != nil {
		return nil, err
	}
	return c.Interface.Cmd(host, command)
}

func (c *contextClient) CmdToString(host, command, separator string) (string, error) {
	if err := c.ctx.Err(); err != nil {
		return "", err
	}
	return c.Interface.CmdToString(host, command, separator)
}

func (c *contextClient) CmdAsync(host string, commands ...string) error {
	return c.CmdAsyncWithContext(c.ctx, host, commands...)
}

func (c *contextClient) CmdAsyncWithContext(
	ctx context.Context,
	host string,
	commands ...string,
) error {
	if err := c.ctx.Err(); err != nil {
		return err
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	stop := context.AfterFunc(c.ctx, cancel)
	defer stop()
	return c.Interface.CmdAsyncWithContext(ctx, host, commands...)
}

func (c *Client) WithContext(ctx context.Context) Interface {
	bound := *c
	bound.ctx = ctx
	return &bound
}

func (cc *clusterClient) WithContext(ctx context.Context) Interface {
	return &clusterClient{
		cluster:  cc.cluster,
		isStdout: cc.isStdout,
		configs:  make(map[string]*Option),
		cache:    make(map[*Option]Interface),
		ctx:      ctx,
	}
}
