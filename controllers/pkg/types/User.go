// Copyright © 2023 sealos.
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

package types

type User struct {
	//UID         string    `bson:"uid" json:"uid"`
	//Name        string    `bson:"name" json:"name"`
	//Email       string    `bson:"email" json:"email"`
	Phone string `bson:"phone" json:"phone"`
	//Wechat      string    `bson:"wechat" json:"wechat"`
	//CreatedTime string    `bson:"created_time" json:"created_time"`
	K8sUsers []K8sUser `bson:"k8s_users" json:"k8s_users"`
}

type K8sUser struct {
	Name string `bson:"name" json:"name"`
}
