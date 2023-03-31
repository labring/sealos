# Generate Changelog 使用说明文档

1. 准备工作

请确保您的项目中有一个名为 CHANGELOG 的目录，该目录将用于存放每个版本的 Changelog 文件。如果还没有这个目录，请创建它：

```shell
mkdir "CHANGELOG"
```

2. 生成特定版本的 Changelog 文件并自动合并

使用 scripts/generate-changelog.sh 脚本生成特定版本的 Changelog 文件，并自动将其合并到 CHANGELOG.md 文件。运行以下命令。运行以下命令：

```shell
bash scripts/generate-changelog.sh <version> [<previous_version>]
```

- <version>：要生成 Changelog 的版本号（例如：1.0.0）。
- [<previous_version>]：可选参数，表示要比较的上一个版本号。如果不提供此参数，脚本将自动获取上一个版本号。

例如，要生成版本 1.0.0 的 Changelog 文件，可以运行：

```shell
bash scripts/generate-changelog.sh 1.0.0
```

脚本将在 CHANGELOG 目录中生成一个名为 CHANGELOG-1.0.0.md 的文件。


3. 将 Changelog 提交到版本控制系统

在生成和合并 Changelog 文件后，请将它们提交到版本控制系统（如 Git），以便其他项目成员能够查看和跟踪项目的变更历史。

```shell
git add CHANGELOG CHANGELOG.md
git commit -m "Add Changelog for version 1.0.0"
git push
```

现在，您已经成功为项目生成了 Changelog 文件，并将其合并到了一个统一的 CHANGELOG.md 文件中。请确保在每次发布新版本时都执行这些步骤，以便项目始终具有最新和完整的变更历史记录。
