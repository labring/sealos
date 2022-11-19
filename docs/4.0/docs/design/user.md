---
sidebar_position: 5
---

# Users/User groups management

As a cloud operating system, user management is the most basic capability. Sealos user management draws on the essence of Linux and supports a multi-tenant management system for user groups.
Similarly, sealos users can also connect to external systems such as OAuth2 or LDAP, but require a super administrator.

## User CRD

```yaml
apiVersion: sealos.io/v1
data:
  password: MWYyZDFlMmU2N2Rm
kind: User
metadata:
  name: fanux
  uid: cfee02d6-c137-11e5-8d73-42010af00002
type: Opaque
```

## root user

The super administrator root, which creates a password during cluster installation, has administrative privileges for the entire cluster.

```yaml
apiVersion: sealos.io/v1
data:
  password: MWYyZDFlMmU2N2Rm
kind: User
metadata:
  name: root
  uid: cfee02d6-c137-11e5-8d73-42010af00002
type: Opaque
```

## Relationship between users and user groups

A user can be in multiple groups, and a group can also have multiple users, which is a many-to-many relationship. Use the UserGroupBinding object to bind the two:

```yaml
kind: UserGroupBinding
apiVersion: sealos.io/v1
metadata:
  name: user-admin-test
subjects:
  - kind: User
    name: "fanux" # Name is case sensitive
    apiGroup: sealos.io/v1
roleRef:
  kind: Group
  name: admin # using admin role
  apiGroup: sealos.io/v1
```

## Relationship between user and namespace

A user can create multiple namespaces, and a namespace can also be accessed by multiple users or user groups. 
Use the UserNamespaceBinding object to bind the two. When a user is created, a namespace will be created for the user by default. 
If the user does not specify ns, all ns created will be in the ns. The quota of the namespace and the processing of the role. 
Whether ordinary users can create a namespace, it should be possible, but it needs to connect to the metering system and charge for it. 
sealos is completely designed according to the needs of the public cloud, no matter the size of the enterprise, 
several times Private cloud is also multi-departmental, and the scenario is more like a public cloud.

## User login

The user's account password is verified when logging in. 
The administrator has the same user interface as the ordinary user, and can switch namespaces freely, 
and the administrator can switch any namespace.
