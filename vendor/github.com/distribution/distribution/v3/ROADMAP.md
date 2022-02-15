# Roadmap

The Distribution project aims to support the following use cases

1. A library to support building highly scalable and reliable container registries,
that can be customised for different backends and use cases. This is used by many
of the largest registry operators, including Docker Hub, GitHub, GitLab, Harbor
and Digital Ocean.
2. A reference implementation of the OCI registry standards, and an easy way to
experiment with new propsals in the registry space as these standards change.
3. Distributed registry tools, such as caching registries and local registries
that can be used within clusters for performance and locality use cases.

As every container application needs at least one registry as part of its infrastructure,
and more cloud native artifacts are using registries as the basis of their distribution,
having a widely used and supported open source registry is important for innovation.
