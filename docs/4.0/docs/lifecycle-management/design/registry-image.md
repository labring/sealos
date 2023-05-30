---
sidebar_position: 1
---

# Image packaging and distribution design

## Background

There are several problems with the current image management method:

1. The registry module is coupled with the filesystem, and a separate management module should be removed. 
2. The docker image is placed in the cluster image, which will cause the size of the cluster image to be very large, and there are actually many redundant files pushed to the warehouse, wasting space.
3. When distributing, it is very inefficient to distribute through scp, and there will be some redundant distribution. 
4. It is impossible to make full use of the characteristics of nydus to distribute cluster images, and some conversions are required. The way of integrating nydus is not clean enough. 
5. Both online and offline scenarios Pull everything down, it is not necessary for services that can be networked.
6. Multi-architecture distribution requires you to judge the system architecture of the target machine by yourself.

## Design

### Build process

1. When building, the Docker image in the cluster image is not processed to ensure that the cluster image is "small".
2. CloudImage is fully compatible with OCI.

### Save process

1. Put the previous action of caching the container image in the Build process into the Save command, then parse the manifests directory, chart directory and imageList, and then put the container image in the registry directory separately. 
2. Save the cluster image to In the registry directory. 
3. The product of Save is the package of the registry directory and some configuration information.
 
### Run process

1. The registry module pulls up the registry according to the registry's configuration.
2. Pull the cluster image on all nodes based on CloudImage Name.
3. start k8s and guest.
4. kubelet automatically pulls other mirrors.
5. You can use the runtime's own capabilities to judge multiple architectures and pull the mirrors of the corresponding architectures.

### Acceleration program

On the basis of this solution, you can directly create the runtime image of containerd+nydus, directly use the capabilities of nydus, and improve the distribution speed of cluster images and container images.
