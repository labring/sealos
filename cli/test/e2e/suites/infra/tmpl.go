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

package infra

//
//const InfraTmpl = `
//metadata:
//  creationTimestamp: null
//  name: sealos-e2e-infra
//  namespace: sealos-e2e-ns
//  uid: 0abafc31-735b-4a9c-923f-493af2ed1b25
//spec:
//  ssh:
//    pkName: e2e-infra-test
//status: {}`
//
////const InfraTmpl = `apiVersion: infra.sealos.io/v1
////kind: Infra
////metadata:
////  name: infra-apply-test
////spec:
////  hosts:
////  - roles: [master] # required
////    count: 3 # Required
////    flavor: "t2.micro"
////    image: "ami-05248307900d52e3a"
////  - roles: [ node ] # required
////    count: 3 # Required
////    flavor: "t2.micro"
////    image: "ami-05248307900d52e3a"`
//
//const HostsTmpl = `
//count: 4
//disks:
//- capacity: 20
//  type: root
//  volumeType: cloud_essd
//- capacity: 20
//  type: data
//  volumeType: cloud_essd
//flavor: ecs.s6-c1m1.small
//image: centos_7_9_x64_20G_alibase_20230109.vhd
//roles:
//- master`
