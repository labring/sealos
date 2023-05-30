---
sidebar_position: 5
---
## User Management System

This document introduces the architecture and usage of the User Management System, which consists of the following main components: User, UserGroup, UserGroupBinding, and their corresponding controllers and webhooks. The system processes and synchronizes resource objects through controllers and validates and sets default values through webhooks to ensure data integrity and correctness.

### User

A User represents an individual user. The User struct includes metadata, Spec (containing CSRExpirationSeconds: the expiration time of the Certificate Signing Request), and Status (containing the user's status and KubeConfig information). The Default method sets default values for the User struct. If CSRExpirationSeconds is not set, it defaults to 7200 seconds. If the UserAnnotationDisplayKey annotation is empty, the User's Name will be used as the default value. The UserReconciler controller is responsible for handling the creation and update operations of the User object.

### UserGroup

A UserGroup represents a group of users. The UserGroup struct includes metadata and UserGroupStatus (containing the status of the user group). The Default method sets default values for the UserGroup struct. If the UserAnnotationDisplayKey annotation is empty, the UserGroup's Name will be used as the default value. The UserGroupReconciler controller is responsible for handling the creation and update operations of the UserGroup object.

### UserGroupBinding

A UserGroupBinding represents the association between a user group and a role. The UserGroupBinding struct includes metadata, Subject (the bound object), RoleRef (the role reference), and UserGroupRef (the user group reference). The Default method sets default values for the UserGroupBinding struct. If the RoleRef is empty, it defaults to RoleRefTypeUser. The Labels are set accordingly based on the UserGroupRef and RoleRef. The UserGroupUserBindingController and UserGroupNamespaceBindingController controllers are responsible for handling the creation, update, and deletion operations of the UserGroupBinding object.

## Architecture Documentation

To use the User Management System, first, create User, UserGroup, and UserGroupBinding objects. When creating the objects, you can provide custom attribute values or use the default values. The system will perform validation and set default values through webhooks to ensure data integrity and correctness.

After the objects are created, the system will automatically handle related operations, such as initializing status, synchronizing Kubernetes configuration, synchronizing user group and namespace bindings, and more. If errors occur during these operations, the system will record the error information in events and attempt to re-execute the operation. The specific operations are as follows:

1. The User controller performs the following operations for the User object:

   - Initialize status
   - Generate kubeconfig for the user based on the user information (currently defaults to the sa method)
      - CSR (Certificate Signing Request)
      - Cert (certificate)
      - SA (Service Account)
      - Webhook
   - Synchronize Owner UserGroup
   - Synchronize Owner UserGroup Namespace Binding
   - Synchronize final status

2. The UserGroup controller performs the following operations for the UserGroup object:

   - Initialize status
   - Synchronize Owner UserGroup User Binding
   - Synchronize final status

3. The UserGroupBinding controller performs the following operations for the UserGroupBinding object:

   For UserGroupNamespaceBindingController:

   - Initialize status
   - Synchronize namespace
   - Synchronize RoleBinding
   - Synchronize final status

   For UserGroupUserBindingController:

   - Initialize status
   - Synchronize ClusterRole generation
   - Synchronize ClusterRoleBinding (based on Owner)
   - Synchronize ClusterRoleBinding
   - Synchronize RoleBinding
   - Synchronize final status

During object creation or updates, the webhook is responsible for validating object attribute values and setting default values as needed. The webhook validation logic mainly includes:

1. Validation for User and UserGroup:
   - Validate if the UserAnnotationDisplayKey annotation is empty
   - Validate if the UserAnnotationOwnerKey annotation is empty
2. Validation for UserGroupBinding:
   - Validate if the UserAnnotationOwnerKey annotation is empty
   - Validate if the UgNameLabelKey label is empty
   - Validate if the UgRoleLabelKey label is empty
   - Validate if the UgBindingKindLabelKey label is empty
   - Validate if the UgBindingNameLabelKey label is empty
   - Validate if the RoleRef is empty
   - Validate if the UserGroupRef is empty
   - Validate if the Subject.Kind is empty
   - Validate if the Subject.Name is empty
   - Validate if the Subject.APIGroup is empty (only when Subject.Kind is not "Namespace")

Some constant fields are:

- UserAnnotationDisplayKey: user.sealos.io/creator

- UserAnnotationOwnerKey: user.sealos.io/display-name

- UgNameLabelKey: user.sealos.io/usergroup.name

- UgRoleLabelKey: user.sealos.io/usergroup.role

- UgBindingKindLabelKey: user.sealos.io/usergroupbinding.kind

- UgBindingNameLabelKey: user.sealos.io/usergroupbinding.name

When creating a user, the system will follow these steps:

1. Create a User object. If no kubeconfig generation method is specified, the system will use the Service Account method by default.
2. If there is no corresponding UserGroup and UserGroupBinding, the system will automatically cascade and create them, assigning default permissions. By default, users will have management permissions for themselves.
3. If you need to add the user to an associated Namespace, manually create the corresponding UserGroupBinding. The system will grant ordinary user permissions accordingly.

### Installation Instructions

#### Pre-installation Preparation

Ensure that you have installed the following dependencies:

- sealos install kubernetes
- Sealos CLI

#### How to Build the Image

In the project's `deploy` folder, run the following command to build the User Management System controller image:

```shell
sealos build -t docker.io/labring/sealos-user-controller:dev -f Dockerfile .
```

This command builds an image named `docker.io/labring/sealos-user-controller:dev` using the `Dockerfile`.

#### How to Run

To run the User Management System controller, use the following command:

```shell
sealos run docker.io/labring/sealos-user-controller:dev
```

This starts the User Management System controller with the recently built image.

The User Management System controller is now successfully installed and running. You can begin using the User Management System to manage users, user groups, and user group bindings.

### Usage Instructions

#### Creating a User

To create a new user, create a file named `user.yaml` with the following content:

```yaml
apiVersion: user.sealos.io/v1
kind: User
metadata:
  name: my-user
spec:
  csrexpirationseconds: 7200
```

Create the user by running the following command:

```shell
kubectl apply -f user.yaml
```

In this example, we created a user named `my-user` and set the CSR expiration time to 7200 seconds. (CSR timeout not yet implemented)

#### Creating a User Group

To create a new user group, create a file named `usergroup.yaml` with the following content:

```yaml
apiVersion: user.sealos.io/v1
kind: UserGroup
metadata:
  name: my-usergroup
```

Create the user group by running the following command:

```shell
kubectl apply -f usergroup.yaml
```

In this example, we created a user group named `my-usergroup`.

#### Creating a User Group Binding for a User

To create a new user group binding for a user, create a file named `usergroupbinding-user.yaml` with the following content:

```yaml
apiVersion: user.sealos.io/v1
kind: UserGroupBinding
metadata:
  name: my-usergroupbinding
spec:
  usergroupref: my-usergroup
  roleref: user
  subject:
    kind: User
    name: my-user
```

Create the user group binding by running the following command:

```shell
kubectl apply -f usergroupbinding-user.yaml
```

In this example, we created a user group binding named `my-usergroupbinding`, binding the user named `my-user` to the user group named `my-usergroup`, and specifying the user role as `user`.

#### Creating a User Group Binding for a Namespace

To create a new user group binding for a namespace, create a file named `usergroupbinding-namespace.yaml` with the following content:

```yaml
apiVersion: user.sealos.io/v1
kind: UserGroupBinding
metadata:
  name: my-usergroupbinding
spec:
  userGroupRef: my-usergroup # The name of the user group
  roleRef: user # The role of the user group in the namespace (e.g., user, manager, etc.)
  subject:
    kind: Namespace # The type of resource being bound (in this case, a namespace)
    name: my-namespace # The name of the resource being bound (in this case, the name of the namespace)
```

Create the user group binding by running the following command:

```shell
kubectl apply -f usergroupbinding-namespace.yaml
```

In this example, we created a user group binding named `my-usergroupbinding`, binding the namespace named `my-namespace` to the user group named `my-usergroup`, and specifying the namespace role as `user`.

By following the above steps, you can successfully create users, user groups, and user group bindings (for both users and namespaces). Using these resources, you can easily manage and control user permissions to meet your organization's needs.

When creating a user, the system automatically performs the following actions:

1. Creates a user group named `ug-{user}`, where `{user}` is the name of the newly created user. This user group is used to store the user's basic information and permission settings.
2. Creates a binding relationship named `ugn-{user}` between the namespace and the user group. This binding relationship associates the user group with a specific namespace, allowing the user to be granted permissions within that namespace.
3. Creates a binding relationship named `ugu-{user}` between the user and the user group. This binding relationship associates the newly created user with the default user group, linking the user's basic information and permission settings with the user group.

In this way, when creating a user, the system automatically assigns default user groups, namespace-to-user group bindings, and user-to-user group bindings. This simplifies the user management process, ensuring that newly created users have basic permissions and configurations.

### Authenticating with the User's Kubeconfig

In the User Management System, the kubeconfig generated for users can be used to access the Kubernetes cluster. Here are the steps to log in to Kubernetes using the User's kubeconfig field:

1. Retrieve the user's kubeconfig field. This can be obtained from the `.status.kubeconfig` field of the user resource, or from the API or other tools.
2. Save the kubeconfig content to a file, such as `user-kubeconfig.yaml`.
3. Configure the `KUBECONFIG` environment variable for kubectl to point to the user kubeconfig file:

```shell
export KUBECONFIG=user-kubeconfig.yaml
```

4. Now, you can interact with the Kubernetes cluster using kubectl, which will authenticate using the specified user kubeconfig.

#### Verifying User Permissions

To verify a user's permissions within the Kubernetes cluster, perform the following steps:

1. Use kubectl to get the current context's user identity:

   ```shell
   kubectl config get-contexts
   ```

2. Check the list of resources the user can access:

   ```shell
   kubectl auth can-i --list
   ```

   This displays the API groups, resources, and operations (e.g., get, list, create, etc.) the current user can access.

3. To check access to a specific resource, use the following command:

   ```shell
   kubectl auth can-i <action> <resource> [--subresource] [-n <namespace>]
   ```

For example, to check if the user can create deployments in the `example-namespace`:

```shell
kubectl auth can-i create deployments -n example-namespace
```

By following these steps, you can log in to the Kubernetes cluster using the user's kubeconfig field and verify the permissions they have within the cluster. You can adjust the user's roles and permissions as needed to provide appropriate access control for your users.
