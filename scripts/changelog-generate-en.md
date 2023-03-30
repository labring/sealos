# Generate Changelog Usage Guide

1. Preparation

Ensure that your project has a directory named `CHANGELOG` to store the Changelog files for each version. If you do not have this directory yet, create it:
```shell
mkdir "CHANGELOG"
```

2. Generate a specific version's Changelog file and automatically merge it

Use the scripts/generate-changelog.sh script to generate a specific version's Changelog file and automatically merge it into the CHANGELOG.md file. Run the following command:

```shell
bash scripts/generate-changelog.sh <version> [<previous_version>]
```

- <version>：The version number for which you want to generate the Changelog (e.g., 1.0.0).
- [<previous_version>]：An optional parameter representing the previous version number to compare with. If not provided, the script will automatically retrieve the previous version number.

For example, to generate the Changelog file for version 1.0.0, run:

```shell
bash scripts/generate-changelog.sh 1.0.0
```

The script will create a file named CHANGELOG-1.0.0.md in the CHANGELOG directory.


3. Commit the Changelog to the version control system

After generating and merging the Changelog files, commit them to the version control system (e.g., Git) so that other project members can view and track the project's change history.

```shell
git add CHANGELOG CHANGELOG.md
git commit -m "Add Changelog for version 1.0.0"
git push
```

Now, you have successfully generated the Changelog file for your project and merged it into a unified CHANGELOG.md file. Make sure to perform these steps every time you release a new version, so the project always has the most recent and complete change history.
