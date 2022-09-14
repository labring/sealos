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

package apiserver

import (
	"context"
	"net/http"

	"github.com/emicklei/go-restful/v3"
	v1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/cache"
	"github.com/labring/sealos/pkg/utils/logger"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
)

// Step is a http server using go-restful/v3
func Step(mgr ctrl.Manager, addr string) error {
	container := restful.NewContainer()
	container.Router(restful.CurlyRouter{})
	log := ctrl.Log.WithName("apiserver")
	h := &handler{
		cache: cache.NewCache(mgr.GetClient(), log),
	}
	webService := new(restful.WebService)
	registerRouter(webService, h)
	container.Add(webService)
	server := &http.Server{Addr: addr, Handler: container}
	logger.Info("start listening on addr", addr)
	return server.ListenAndServe()
}

type handler struct {
	cache *cache.Cache
}

// registerRouter Register list Router
func registerRouter(route *restful.WebService, hd *handler) {
	route.Path("/").
		Consumes("*/*").
		Produces(restful.MIME_JSON)
	route.Route(route.GET("/apis/user.sealos.io/v1/{resource}/{name}").
		To(hd.Get).
		Produces(restful.MIME_JSON))
	route.Route(route.GET("/info").To(hd.Info))
}

func (*handler) Info(_ *restful.Request, response *restful.Response) {
	info := &Info{}
	info.Kind = "UserControllerInfo"
	info.APIVersion = "user.sealos.io/" + runtime.APIVersionInternal
	info.FeatureGates = map[string]string{
		"ListUserByuUergroup":      "/apis/user.sealos.io/v1/listuserbyusergroups/{name}",
		"ListNamespaceByUsergroup": "/apis/user.sealos.io/v1/listnamespacebyusergroups/{name}",
		"ListUserGroupbyUser":      "/apis/user.sealos.io/v1/listusergroupbyusers/{name}",
	}
	response.Header().Set("Content-Type", "application/json")
	_ = response.WriteAsJson(info)
}

func (hd *handler) Get(req *restful.Request, response *restful.Response) {
	response.Header().Set("Content-Type", "application/json")
	source := req.PathParameter("resource")
	name := req.PathParameter("name")
	var ugbs []v1.UserGroupBinding
	switch source {
	case "listuserbyusergroups":
		ugbs = hd.cache.FetchUserFromUserGroup(context.TODO(), name)
	case "listnamespacebyusergroups":
		ugbs = hd.cache.FetchNamespaceFromUserGroup(context.TODO(), name)
	case "listusergroupbyusers":
		ugbs = hd.cache.FetchUserGroupFromUser(context.TODO(), name)
	}

	ugbList := &v1.UserGroupBindingList{
		TypeMeta: metav1.TypeMeta{
			Kind:       "UserGroupBindingList",
			APIVersion: v1.GroupVersion.String(),
		},
		Items: ugbs,
	}
	_ = response.WriteAsJson(ugbList)
}
