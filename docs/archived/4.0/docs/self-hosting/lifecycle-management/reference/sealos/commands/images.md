---
sidebar_position: 6
---

# Image List

Sealos' `images` command is primarily used to view locally stored images. Users can use it to view all local images or to filter and view specific images. The command supports various parameters to help users view and manage images more conveniently.

## Basic Usage

The basic `sealos images` command will display all non-intermediate stage local images, for example:

```bash
sealos images
```

This will display all final stage images stored locally.

## Examples

Here are some common examples of the `sealos images` command:

1. Display all images, including intermediate images built:

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

Here are some common parameters for the `sealos images` command:

- `-a, --all`: Display all images, including intermediate images built.

- `--digests`: Display the digests of images.

- `-f, --filter`: Filter output based on provided conditions.

- `--format`: Beautify the images printout using a Go template.

- `--history`: Display the naming history of images.

- `--json`: Output in JSON format.

- `--no-trunc`: Do not truncate the output.

- `-n, --noheading`: Do not print column headings.

- `-q, --quiet`: Only display image IDs.

By combining these parameters, users can easily retrieve and manage locally stored images. For example, using the `--all` parameter displays all images, including intermediate ones; using the `--filter` parameter filters images based on specific conditions; using the `--json` parameter outputs image information in JSON format, facilitating programmatic processing, etc.

That's the usage guide for the `sealos images` command, and we hope it has been helpful. If you encounter any problems during usage, feel free to ask us.
