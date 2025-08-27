// Copyright © 2024 sealos.
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

package usernotify

import (
	"context"
	"fmt"
	"sync"

	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/google/uuid"
)

type MemoryContactProvider struct {
	contacts map[uuid.UUID]*types.NotificationRecipient
	mutex    sync.RWMutex
}

func NewMemoryContactProvider() *MemoryContactProvider {
	return &MemoryContactProvider{
		contacts: make(map[uuid.UUID]*types.NotificationRecipient),
	}
}

func (p *MemoryContactProvider) GetUserContact(ctx context.Context, userUID uuid.UUID) (*types.NotificationRecipient, error) {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

	contact, exists := p.contacts[userUID]
	if !exists {
		return nil, fmt.Errorf("user contact not found for user: %s", userUID)
	}

	return contact, nil
}

func (p *MemoryContactProvider) SetUserContact(userUID uuid.UUID, recipient *types.NotificationRecipient) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	p.contacts[userUID] = recipient
}

func (p *MemoryContactProvider) RemoveUserContact(userUID uuid.UUID) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	delete(p.contacts, userUID)
}

func (p *MemoryContactProvider) GetAllContacts() map[uuid.UUID]*types.NotificationRecipient {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

	result := make(map[uuid.UUID]*types.NotificationRecipient)
	for k, v := range p.contacts {
		result[k] = v
	}

	return result
}
