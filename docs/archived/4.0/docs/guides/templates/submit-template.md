---
sidebar_position: 2
---

# Submit template

Every template in the Sealos template marketplace is directly and continuously updated from the [Sealos Template Repository](https://github.com/labring-actions/templates). For those interested in contributing new templates, the process involves submitting a Pull Request (PR) to this repository.

To craft a new template, reference is available in the form of the [template.yaml](https://github.com/labring-actions/templates/blob/main/template.yaml) file. The system is equipped with a variety of common environment variables and functions that are accessible during the template development process. These integrated features enable the use of syntax akin to `GitHub Actions`. For instance, environment variables such as `${{ SEALOS_NAMESPACE }}` can be utilized to configure specific parameters in the template. Comprehensive details about these built-in environment variables are available in the [Template Guidelines](https://github.com/labring-actions/templates/blob/main/example.md).