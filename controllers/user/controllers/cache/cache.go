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

package cache

import (
	"context"

	"github.com/go-logr/logr"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type Cache struct {
	Logger logr.Logger
	client.Client
}

func NewCache(cli client.Client, logger logr.Logger) *Cache {
	return &Cache{
		Logger: logger,
		Client: cli,
	}
}

func SetupCache(mgr ctrl.Manager) error {
	ugb := &userv1.UserGroupBinding{}
	ugRefFunc := func(obj client.Object) []string {
		return []string{obj.(*userv1.UserGroupBinding).UserGroupRef}
	}
	subjectKindFunc := func(obj client.Object) []string {
		return []string{obj.(*userv1.UserGroupBinding).Subject.Kind}
	}
	subjectNameFunc := func(obj client.Object) []string {
		return []string{obj.(*userv1.UserGroupBinding).Subject.Name}
	}
	if err := mgr.GetFieldIndexer().IndexField(context.TODO(), ugb, "userGroupRef", ugRefFunc); err != nil {
		return err
	}
	if err := mgr.GetFieldIndexer().IndexField(context.TODO(), ugb, "subject.kind", subjectKindFunc); err != nil {
		return err
	}
	if err := mgr.GetFieldIndexer().IndexField(context.TODO(), ugb, "subject.name", subjectNameFunc); err != nil {
		return err
	}
	return nil
}

func (r *Cache) FetchNamespaceFromUserGroup(ctx context.Context, userGroup string) (namespaces []userv1.UserGroupBinding) {
	ugUserBindingList := make([]userv1.UserGroupBindingList, 0)
	var ugUserBinding userv1.UserGroupBindingList
	if err := r.List(ctx, &ugUserBinding, client.MatchingFields{"userGroupRef": userGroup}); err != nil {
		r.Logger.Error(err, "list ugUserBinding error from cache", "userGroupRef", userGroup)
	}
	ugUserBindingList = append(ugUserBindingList, ugUserBinding)
	if err := r.List(ctx, &ugUserBinding, client.MatchingFields{"subject.kind": "Namespace"}); err != nil {
		r.Logger.Error(err, "list ugUserBinding error from cache", "subject.kind", "User")
	}
	ugUserBindingList = append(ugUserBindingList, ugUserBinding)

	var newAny helper.Any

	for i, item := range ugUserBindingList {
		newIAny := helper.NewAny(nil)
		for _, j := range item.Items {
			newIAny = newIAny.InsertValue(j.Name, j)
		}
		if i == 0 {
			newAny = newIAny
		}
		newAny = newAny.Intersection(newIAny)
	}
	values := newAny.ListValue()
	for _, value := range values {
		if ns, ok := value.(userv1.UserGroupBinding); ok {
			namespaces = append(namespaces, ns)
		}
	}
	return
}

func (r *Cache) FetchUserFromUserGroup(ctx context.Context, userGroup string) (users []userv1.UserGroupBinding) {
	ugUserBindingList := make([]userv1.UserGroupBindingList, 0)
	var ugUserBinding userv1.UserGroupBindingList
	if err := r.List(ctx, &ugUserBinding, client.MatchingFields{"userGroupRef": userGroup}); err != nil {
		r.Logger.Error(err, "list ugUserBinding error from cache", "userGroupRef", userGroup)
	}
	ugUserBindingList = append(ugUserBindingList, ugUserBinding)
	if err := r.List(ctx, &ugUserBinding, client.MatchingFields{"subject.kind": "User"}); err != nil {
		r.Logger.Error(err, "list ugUserBinding error from cache", "subject.kind", "User")
	}
	ugUserBindingList = append(ugUserBindingList, ugUserBinding)

	var newAny helper.Any

	for i, item := range ugUserBindingList {
		newIAny := helper.NewAny(nil)
		for _, j := range item.Items {
			newIAny = newIAny.InsertValue(j.Name, j)
		}
		if i == 0 {
			newAny = newIAny
		}
		newAny = newAny.Intersection(newIAny)
	}
	values := newAny.ListValue()
	for _, value := range values {
		if u, ok := value.(userv1.UserGroupBinding); ok {
			users = append(users, u)
		}
	}
	return
}

func (r *Cache) FetchUserGroupFromUser(ctx context.Context, user string) (userGroups []userv1.UserGroupBinding) {
	ugUserBindingList := make([]userv1.UserGroupBindingList, 0)
	var ugUserBinding userv1.UserGroupBindingList
	if err := r.List(ctx, &ugUserBinding, client.MatchingFields{"subject.name": user}); err != nil {
		r.Logger.Error(err, "list ugUserBinding error from cache", "subject.name", user)
	}
	ugUserBindingList = append(ugUserBindingList, ugUserBinding)
	if err := r.List(ctx, &ugUserBinding, client.MatchingFields{"subject.kind": "User"}); err != nil {
		r.Logger.Error(err, "list ugUserBinding error from cache", "subject.kind", "User")
	}
	ugUserBindingList = append(ugUserBindingList, ugUserBinding)

	var newAny helper.Any

	for i, item := range ugUserBindingList {
		newIAny := helper.NewAny(nil)
		for _, j := range item.Items {
			newIAny = newIAny.InsertValue(j.Name, j)
		}
		if i == 0 {
			newAny = newIAny
		}
		newAny = newAny.Intersection(newIAny)
	}
	values := newAny.ListValue()
	for _, value := range values {
		if u, ok := value.(userv1.UserGroupBinding); ok {
			userGroups = append(userGroups, u)
		}
	}
	return
}
