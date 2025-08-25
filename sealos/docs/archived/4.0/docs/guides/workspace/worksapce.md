---
sidebar_position: 5
---

# Team Collaboration and Workspace

## Term Definitions

### Workspace

Workspace is a core feature of the Sealos Cloud Operating System, implemented based on Kubernetes namespaces. It serves
as a multi-tenant resource isolation mechanism, allowing the partitioning of a Kubernetes cluster into multiple
workspaces. Each workspace has its own resource quotas and permissions, enabling the allocation of different users to
distinct workspaces for resource isolation and permission control.

Personal workspace is a special form of workspace. Each user has a personal workspace with a name identical to their
username. The resource quotas and permissions of personal workspaces are the same as regular workspaces. However,
personal workspaces cannot be deleted, and other users cannot be added to them.

### Roles and Permissions

Users within a workspace can have different roles, each with its own set of permissions. Currently, Sealos Cloud
Operating System includes the following roles: Owner, Manager, and Developer.

+ Owner: Possesses all permissions within the workspace, including deleting the workspace, viewing/creating/modifying
  all resources within the workspace, and inviting users to join the workspace as administrators/developers.
+ Manager: Possesses managerial permissions within the workspace, such as viewing/creating/modifying all resources
  within the workspace and inviting users to join as developers.
+ Developer: Possesses development permissions within the workspace, including viewing the status of resources within
  the workspace.

## Quick Start

### Create Workspace

![create-workspace.gif](images%2Fcreate-workspace.gif)

### Switch Workspace

![switch-workspace.gif](images%2Fswitch-workspace.gif)

### Invite Users to Join Workspace

Invite users to join the workspace using their user ID. The invited users can choose to accept or decline the
invitation. If accepted, the invited users become members of the workspace with resource permissions.

![invite-user.gif](images%2Finvite-user.gif)

### Accept Invitation

When a user is invited to join a workspace, they can view the invitation message in the management panel. By clicking on
the invitation message, they can see the details and accept the invitation. After acceptance, the user becomes a member
of the workspace with resource permissions.

![accept-invite.gif](images%2Faccept-invite.gif)