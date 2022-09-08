# add user

create user:

```yaml
apiVersion: user.sealos.io/v1
kind: User
metadata:
  name: f8699ded-58d3-432b-a9ff-56568b57a38d
spec:
  displayName: cuisongliu
  csrExpirationSeconds: 1000000000

```

show all resources:

```yaml
apiVersion: v1
items:
- apiVersion: user.sealos.io/v1
  kind: User
  metadata:
    creationTimestamp: "2022-09-07T14:06:56Z"
    finalizers:
    - sealos.io/user.finalizers
    generation: 1
    name: f8699ded-58d3-432b-a9ff-56568b57a38d
    resourceVersion: "81068"
    uid: dc25db9a-3c07-411a-9d0f-d77a943cfd07
  spec:
    csrExpirationSeconds: 1000000000
    displayName: cuisongliu
- apiVersion: user.sealos.io/v1
  kind: UserGroup
  metadata:
    annotations:
      user.sealos.io/creator: f8699ded-58d3-432b-a9ff-56568b57a38d
    creationTimestamp: "2022-09-07T14:06:56Z"
    finalizers:
    - sealos.io/user.group.finalizers
    generation: 1
    name: ug-f8699ded-58d3-432b-a9ff-56568b57a38d
    ownerReferences:
    - apiVersion: user.sealos.io/v1
      blockOwnerDeletion: true
      controller: true
      kind: User
      name: f8699ded-58d3-432b-a9ff-56568b57a38d
      uid: dc25db9a-3c07-411a-9d0f-d77a943cfd07
    resourceVersion: "81052"
    uid: 2e2a0e63-8510-4527-9cd5-b36085760ed9
- apiVersion: user.sealos.io/v1
  kind: UserGroupBinding
  metadata:
    annotations:
      user.sealos.io/creator: f8699ded-58d3-432b-a9ff-56568b57a38d
    creationTimestamp: "2022-09-07T14:06:56Z"
    finalizers:
    - sealos.io/user.group.binding.finalizers
    generation: 1
    name: ugn-f8699ded-58d3-432b-a9ff-56568b57a38d
    ownerReferences:
    - apiVersion: user.sealos.io/v1
      blockOwnerDeletion: true
      controller: true
      kind: User
      name: f8699ded-58d3-432b-a9ff-56568b57a38d
      uid: dc25db9a-3c07-411a-9d0f-d77a943cfd07
    resourceVersion: "81057"
    uid: 4d0bf140-f31f-4413-a276-4810566eb873
  roleRef: user
  subject:
    kind: Namespace
    name: ns-f8699ded-58d3-432b-a9ff-56568b57a38d
  userGroupRef: ug-f8699ded-58d3-432b-a9ff-56568b57a38d
- apiVersion: user.sealos.io/v1
  kind: UserGroupBinding
  metadata:
    annotations:
      user.sealos.io/creator: f8699ded-58d3-432b-a9ff-56568b57a38d
    creationTimestamp: "2022-09-07T14:06:56Z"
    finalizers:
    - sealos.io/user.group.binding.finalizers
    generation: 1
    name: ugu-f8699ded-58d3-432b-a9ff-56568b57a38d
    ownerReferences:
    - apiVersion: user.sealos.io/v1
      blockOwnerDeletion: true
      controller: true
      kind: UserGroup
      name: ug-f8699ded-58d3-432b-a9ff-56568b57a38d
      uid: 2e2a0e63-8510-4527-9cd5-b36085760ed9
    resourceVersion: "82412"
    uid: be7d630b-5ecc-4fc8-8dff-9b25a5ea9538
  roleRef: user
  subject:
    apiGroup: user.sealos.io
    kind: User
    name: f8699ded-58d3-432b-a9ff-56568b57a38d
  userGroupRef: ug-f8699ded-58d3-432b-a9ff-56568b57a38d
kind: List
metadata:
  resourceVersion: ""
```

# add userGroup
```yaml
apiVersion: user.sealos.io/v1
kind: UserGroup
metadata:
  annotations:
    user.sealos.io/creator: f8699ded-58d3-432b-a9ff-56568b57a38d
  creationTimestamp: "2022-09-07T14:06:56Z"
  finalizers:
  - sealos.io/user.group.finalizers
  generation: 1
  name: ug-f8699ded-58d3-432b-a9ff-56568b57a38d
  ownerReferences:
  - apiVersion: user.sealos.io/v1
    blockOwnerDeletion: true
    controller: true
    kind: User
    name: f8699ded-58d3-432b-a9ff-56568b57a38d
    uid: dc25db9a-3c07-411a-9d0f-d77a943cfd07
  resourceVersion: "81052"
  uid: 2e2a0e63-8510-4527-9cd5-b36085760ed9
```
# add user to  userGroup
```yaml
apiVersion: user.sealos.io/v1
kind: UserGroupBinding
metadata:
  annotations:
    user.sealos.io/creator: f8699ded-58d3-432b-a9ff-56568b57a38d
  creationTimestamp: "2022-09-07T14:06:56Z"
  finalizers:
  - sealos.io/user.group.binding.finalizers
  generation: 1
  name: ugu-f8699ded-58d3-432b-a9ff-56568b57a38d
  ownerReferences:
  - apiVersion: user.sealos.io/v1
    blockOwnerDeletion: true
    controller: true
    kind: UserGroup
    name: ug-f8699ded-58d3-432b-a9ff-56568b57a38d
    uid: 2e2a0e63-8510-4527-9cd5-b36085760ed9
  resourceVersion: "82412"
  uid: be7d630b-5ecc-4fc8-8dff-9b25a5ea9538
roleRef: user
subject:
  apiGroup: user.sealos.io
  kind: User
  name: f8699ded-58d3-432b-a9ff-56568b57a38d
userGroupRef: ug-f8699ded-58d3-432b-a9ff-56568b57a38d
```
# add namespace to userGroup

```yaml
apiVersion: user.sealos.io/v1
kind: UserGroupBinding
metadata:
  annotations:
    user.sealos.io/creator: f8699ded-58d3-432b-a9ff-56568b57a38d
  creationTimestamp: "2022-09-07T14:06:56Z"
  finalizers:
    - sealos.io/user.group.binding.finalizers
  generation: 1
  name: ugn-f8699ded-58d3-432b-a9ff-56568b57a38d
  ownerReferences:
    - apiVersion: user.sealos.io/v1
      blockOwnerDeletion: true
      controller: true
      kind: User
      name: f8699ded-58d3-432b-a9ff-56568b57a38d
      uid: dc25db9a-3c07-411a-9d0f-d77a943cfd07
  resourceVersion: "81057"
  uid: 4d0bf140-f31f-4413-a276-4810566eb873
roleRef: user
subject:
  kind: Namespace
  name: ns-f8699ded-58d3-432b-a9ff-56568b57a38d
userGroupRef: ug-f8699ded-58d3-432b-a9ff-56568b57a38d
```

# add manager to userGroup

```yaml
apiVersion: user.sealos.io/v1
kind: UserGroupBinding
metadata:
  annotations:
    user.sealos.io/creator: f8699ded-58d3-432b-a9ff-56568b57a38d
  creationTimestamp: "2022-09-07T14:06:56Z"
  finalizers:
  - sealos.io/user.group.binding.finalizers
  generation: 1
  name: ugu-f8699ded-58d3-432b-a9ff-56568b57a38d
  ownerReferences:
  - apiVersion: user.sealos.io/v1
    blockOwnerDeletion: true
    controller: true
    kind: UserGroup
    name: ug-f8699ded-58d3-432b-a9ff-56568b57a38d
    uid: 2e2a0e63-8510-4527-9cd5-b36085760ed9
  resourceVersion: "82412"
  uid: be7d630b-5ecc-4fc8-8dff-9b25a5ea9538
roleRef: manager
subject:
  apiGroup: user.sealos.io
  kind: User
  name: f8699ded-58d3-432b-a9ff-56568b57a38d
userGroupRef: ug-f8699ded-58d3-432b-a9ff-56568b57a38d
```
