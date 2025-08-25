---
sidebar_position: 1
---

# Efficient Sealos Cluster Image Synchronization and Backup Strategy

In our daily work, we may encounter some common needs and issues, such as:

1. Needing to regularly backup the image repository in the cluster, but not wanting to synchronize everything.
2. Needing to use an external image repository, but the container images in the Sealos cluster image are not yet available.
3. Container images are large, and there is a desire to avoid transferring image files during Sealos operation to reduce bandwidth usage.

To solve the above problems, Sealos provides an elegant solution. Below, I will guide you step by step to understand this solution.

## Creating and Starting a Temporary Repository

First, we need the registry directory in the cluster image for image synchronization. Therefore, execute the following command to pull the cluster image and create a working directory:

```shell
sealos pull labring/kubernetes:v1.24.0 
sealos create labring/kubernetes:v1.24.0
```

Then, we start a temporary registry in the registry directory of the working directory. For convenience, we can fix a port, such as 9090. Then, execute the following command:

```shell
sealos registry serve filesystem -p 9090 registry
```

Note that this is a resident process. Please ensure the service is available before synchronization is complete.

## Image Synchronization

Next, we synchronize the local cluster image to sealos.hub:5000 (or other repositories) in the cluster. Before executing the synchronization command, if the repository needs authentication, please first use sealos login to login. Then, execute the following command:

```shell
sealos registry sync 127.0.0.1:9090 sealos.hub:5000
```

## Results Display

After executing the above steps, you will see an output similar to the following:

```tex
Getting image source signatures
Copying blob d92bdee79785 skipped: already exists
Copying blob 88efb86cbcab skipped: already exists
Copying config edaa71f2ae done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob 8dc21145ed67 skipped: already exists
Copying blob 4cae93f7d292 skipped: already exists
Copying blob 65cd6b3674e6 skipped: already exists
Copying blob b0b160e41cf3 skipped: already exists
Copying blob 9e2e80d6f31a skipped: already exists
Copying config a9a710bb96 done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob e2227eec2e9e skipped: already exists
Copying blob 9dd6bd026ac4 skipped: already exists
Copying blob b0b160e41cf3 skipped: already exists
Copying config b62a103951 done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob b100dd428c40 skipped: already exists
Copying blob b0b160e41cf3 skipped: already exists
Copying blob 9dd6bd026ac4 skipped: already exists
Copying config 59fad34d4f done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob d26839182af9 skipped: already exists
Copying blob 812e11da6772 skipped: already exists
Copying blob d5c2703e56e5 skipped: already exists
Copying config 66e1443684 done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob cd1468482

c69 skipped: already exists
Copying blob 9dd6bd026ac4 skipped: already exists
Copying blob b0b160e41cf3 skipped: already exists
Copying config b81513b3bf done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob 9b18e9b68314 skipped: already exists
Copying blob 25f2d353fdd8 skipped: already exists
Copying blob 23a7cdce4c6c skipped: already exists
Copying config 2b25f03fc8 done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob aff472d3f83e skipped: already exists
Copying config e5a475a038 done
Writing manifest to image destination
Storing signatures
Sync completed
```

As you can see, existing images will not be synchronized again, this can achieve incremental image synchronization, making the entire process very elegant and efficient.

---

That's the solution we're presenting this time, I hope it's helpful to you.
