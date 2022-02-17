// Copyright 2020 Huawei Technologies Co.,Ltd.
//
// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

package cache

import (
	"sync"
)

var (
	c    *Cache
	once sync.Once
)

type Cache struct {
	value map[string]string
}

func GetCache() *Cache {
	once.Do(func() {
		c = &Cache{
			value: make(map[string]string),
		}
	})

	return c
}

func (c *Cache) PutAuth(key string, value string) error {
	c.value[key] = value
	return nil
}

func (c *Cache) GetAuth(key string) (string, bool) {
	value, ok := c.value[key]
	return value, ok
}
