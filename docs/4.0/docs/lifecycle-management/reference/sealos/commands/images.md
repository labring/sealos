---
sidebar_position: 6
---

# images: Image List

The `sealos images` command in Sealos is primarily used to view the images stored locally. Users can use this command to view all local images or filter and view specific images. The command supports multiple parameters to help users conveniently view and manage images.

## Basic Usage

The basic `sealos images` command displays all local images in their final stages, excluding intermediate stages. For example:

```bash
sealos images
```

This will display all the final-stage images stored locally.

## Examples

Here are some common examples of the `sealos images` command:

1. Display all images, including intermediate built images:

   ```bash
   sealos images --all
   ```

2. Display a specific image:

   ```bash
   sealos images [imageName]
   ```

3. Display images in a specified Go template format:

   ```bash
   sealos images --format '{{.ID}} {{.Name}} {{.Size}} {{.CreatedAtRaw}}'
   ```

## Parameters

Here are some commonly used parameters of the `sealos images` command:

- `-a, --all`: Display all images, including intermediate images generated during the build process.

- `--digests`: Display the digests of the images.

- `-f, --filter`: Filter the output based on the provided conditions.

- `--format`: Beautify and print the images using a Go template.

- `--history`: Display the image's naming history.

- `--json`: Output in JSON format.

- `--no-trunc`: Do not truncate the output.

- `-n, --noheading`: Do not print column headings.

- `-q, --quiet`: Only display the image IDs.

By combining these parameters, users can easily retrieve and manage the images stored locally. For example, using the `--all` parameter allows viewing all images, including intermediate images. The `--filter` parameter can be used to filter images based on specific conditions. The `--json` parameter allows outputting image information in JSON format for easy programmatic processing.

That concludes the usage guide for the `sealos images` command. We hope this information has been helpful to you. If you encounter any issues during usage, please feel free to ask us for assistance.
