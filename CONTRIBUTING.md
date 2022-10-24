If you don't understand the github open source project contribution process at all, it is strongly recommended to read: [first contributions](https://github.com/firstcontributions/first-contributions)

# Contributing to sealos

It is warmly welcomed if you have interest to hack on sealos. First, we encourage this kind of willing very much. And here is a list of contributing guide for you.

## Topics

- [Reporting security issues](#reporting-security-issues)
- [Reporting general issues](#reporting-general-issues)
- [Code and doc contribution](#code-and-doc-contribution)
- [Engage to help anything](#engage-to-help-anything)

## Reporting security issues

Security issues are always treated seriously. As our usual principle, we discourage anyone to spread security issues. If you find a security issue of sealos, please do not discuss it in public and even do not open a public issue. Instead we encourage you to send us a private email to [admin@sealyun.com](mailto:admin@sealyun.com) to report this.

## Reporting general issues

To be honest, we regard every user of sealos as a very kind contributor. After experiencing sealos, you may have some feedback for the project. Then feel free to open an issue via [NEW ISSUE](https://github.com/labring/sealos/issues/new/choose).

Since we collaborate project sealos in a distributed way, we appreciate **WELL-WRITTEN**, **DETAILED**, **EXPLICIT** issue reports. To make the communication more efficient, we wish everyone could search if your issue is an existing one in the searching list. If you find it existing, please add your details in comments under the existing issue instead of opening a brand new one.

To make the issue details as standard as possible, we setup an [ISSUE TEMPLATE](https://github.com/labring/sealos/tree/main/.github/ISSUE_TEMPLATE) for issue reporters. You can find three kinds of issue templates there: question, bug report and feature request. Please **BE SURE** to follow the instructions to fill fields in template.

There are a lot of cases when you could open an issue:

- bug report
- feature request
- performance issues
- feature proposal
- feature design
- help wanted
- doc incomplete
- test improvement
- any questions on project
- and so on

Also, we must remind that when filing a new issue, please remember to remove the sensitive data from your post. Sensitive data could be password, secret key, network locations, private business data and so on.

## Code and doc contribution

Every action to make project sealos better is encouraged. On GitHub, every improvement for sealos could be via a PR (short for pull request).

- If you find a typo, try to fix it!
- If you find a bug, try to fix it!
- If you find some redundant codes, try to remove them!
- If you find some test cases missing, try to add them!
- If you could enhance a feature, please **DO NOT** hesitate!
- If you find code implicit, try to add comments to make it clear!
- If you find code ugly, try to refactor that!
- If you can help to improve documents, it could not be better!
- If you find document incorrect, just do it and fix that!
- ...

Actually it is impossible to list them completely. Just remember one princinple:

> WE ARE LOOKING FORWARD TO ANY PR FROM YOU.

Since you are ready to improve sealos with a PR, we suggest you could take a look at the PR rules here.

- [Workspace Preparation](#workspace-preparation)
- [Branch Definition](#branch-definition)
- [Commit Rules](#commit-rules)
- [PR Description](#pr-description)
- [Developing Environment](#developing-environment)
- [Docs Contribution](#docs-contribution)

### Workspace Preparation

To put forward a PR, we assume you have registered a GitHub ID. Then you could finish the preparation in the following steps:

1. **FORK** sealos to your repository. To make this work, you just need to click the button Fork in right-left of [labring/sealos](https://github.com/labring/sealos) main page. Then you will end up with your repository in `https://github.com/<your-username>/sealos`, in which `your-username` is your GitHub username.

1. **CLONE** your own repository to master locally. Use `git clone https://github.com/<your-username>/sealos.git` to clone repository to your local machine. Then you can create new branches to finish the change you wish to make.

1. **Set Remote** upstream to be `https://github.com/labring/sealos.git` using the following two commands:

   ```shell
   git remote add upstream https://github.com/labring/sealos.git
   git remote set-url --push upstream no-pushing
   ```

   With this remote setting, you can check your git remote configuration like this:

   ```shell
   $ git remote -v
   origin     https://github.com/<your-username>/sealos.git (fetch)
   origin     https://github.com/<your-username>/sealos.git (push)
   upstream   https://github.com/labring/sealos.git (fetch)
   upstream   no-pushing (push)
   ```

   Adding this, we can easily synchronize local branches with upstream branches.

1. **Create a branch** to add a new feature or fix issues

   Update local working directory and remote forked repository:

   ```shell
   cd sealos
   git fetch upstream
   git checkout main
   ```

   Create a new branch:

   ```shell
   git checkout -b <new-branch>
   ```

   Make any change on the `new-branch` then build and test your codes.
1. **Commit your changes** to your local branch, lint before committing and commit with sign-off
   ```shell
   git rebase upstream/main
   golangci-lint run -c .golangci.yml # lint
   git add -A  # add changes to staging
   git commit -s -m "message for your changes" # -s adds a Signed-off-by trailer
   ```

1. **Push your branch** to your forked repository, it is recommended to have only one commit for a PR.

   ```shell
   # sync up with upstream
   git fetch upstream main
   git rebase upstream/main

   git rebase -i	<commit-id> # rebase with interactive mode to squash your commits into a single one
   git push # push to the remote repository, if it's a first time push, run git push --set-upstream origin <new-branch>
   ```

   You can also use `git commit -s --amend && git push -f` to update modifications on the previous commit.

   If you have developed multiple features in the same branch, you should create PR separately by rebasing to the main branch between each push:

   ```shell
   # create new branch, for example git checkout -b feature/infra
   git checkout -b <new branch>
   # update some code, feature1
   git add -A
   git commit -m -s "feature one"
   git push # if it's first time push, run git push --set-upstream origin <new-branch>
   # then create pull request, and merge
   # update some new feature, feature2, rebase main branch first.
   git rebase upstream/main # rebase the current branch to upstream/main branch
   git add -A
   git commit -m -s "feature two"
   # then create pull request, and merge
   ```

1. **File a pull request** to labring/sealos:master

   It is recommended to review your changes before filing a pull request. Check if your code doesn't conflict with the main branch and no redundant code is included.

### Branch Definition

Right now we assume every contribution via pull request is for [branch master](https://github.com/labring/sealos/tree/master) in sealos. Before contributing, be aware of branch definition would help a lot.

As a contributor, keep in mind again that every contribution via pull request is for branch master. While in project sealos, there are several other branches, we generally call them rc branches, release branches and backport branches.

Before officially releasing a version, we will checkout a rc(release candidate) branch. In this branch, we will test more than branch main.

When officially releasing a version, there will be a release branch before tagging. After tagging, we will delete the release branch.

When backporting some fixes to existing released version, we will checkout backport branches. After backporting, the backporting effects will be in PATCH number in MAJOR.MINOR.PATCH of [SemVer](http://semver.org/).

### Commit Rules

Actually in sealos, we take two rules serious when committing:

- [Commit Message](#commit-message)
- [Commit Content](#commit-content)

#### Commit Message

Commit message could help reviewers better understand what the purpose of submitted PR is. It could help accelerate the code review procedure as well. We encourage contributors to use **EXPLICIT** commit message rather than ambiguous message. In general, we advocate the following commit message type:

- docs: xxxx. For example, "docs: add docs about storage installation".
- feature: xxxx.For example, "feature: make result show in sorted order".
- bugfix: xxxx. For example, "bugfix: fix panic when input nil parameter".
- style: xxxx. For example, "style: format the code style of Constants.java".
- refactor: xxxx. For example, "refactor: simplify to make codes more readable".
- test: xxx. For example, "test: add unit test case for func InsertIntoArray".
- chore: xxx. For example, "chore: integrate travis-ci". It's the type of mantainance change.
- other readable and explicit expression ways.

On the other side, we discourage contributors from committing message like the following ways:

- ~~fix bug~~
- ~~update~~
- ~~add doc~~

#### Commit Content

Commit content represents all content changes included in one commit. We had better include things in one single commit which could support reviewer's complete review without any other commits' help. In another word, contents in one single commit can pass the CI to avoid code mess. In brief, there are two minor rules for us to keep in mind:

- avoid very large change in a commit;
- complete and reviewable for each commit.

No matter what the commit message, or commit content is, we do take more emphasis on code review.

### PR Description

PR is the only way to make change to sealos project files. To help reviewers better get your purpose, PR description could not be too detailed. We encourage contributors to follow the [PR template](https://github.com/labring/sealos/tree/main/.github/PULL_REQUEST_TEMPLATE.md) to finish the pull request.

### Developing Environment

As a contributor, if you want to make any contribution to sealos project, we should reach an agreement on the version of tools used in the development environment.
Here are some dependents with specific version:

- golang : v1.16+
- golangci-lint: 1.46.2

When you develop the sealos project at the local environment, you should use subcommands of Makefile to help yourself to check and build the latest version of sealos. For the convenience of developers, we use the docker to build sealos. It can reduce problems of the developing environment.

### Docs Contribution

#### Structure and Repo

The documentation for sealos includes:

- [README.md](https://github.com/labring/sealos/blob/main/README.md)
- [CONTRIBUTING.md](https://github.com/labring/sealos/blob/main/CONTRIBUTING.md)
- [DEVELOPGUIDE.md](https://github.com/labring/sealos/blob/main/DEVELOPGUIDE.md)
- Files under [docs/4.0](https://github.com/labring/sealos/blob/main/docs/4.0)
   - English docs under [docs/4.0/docs](https://github.com/labring/sealos/tree/main/docs/4.0/docs)
   - Chinese docs under [docs/4.0/i18n/zh-Hans](https://github.com/labring/sealos/tree/main/docs/4.0/i18n/zh-Hans)
   - Images under [docs/4.0/img](https://github.com/labring/sealos/tree/main/docs/4.0/img)

If you have experiences in [Docusaurus 2](https://docusaurus.io), you might find the directory structure familiar. Indeed, the [sealos documentation website](https://github.com/fanux/sealos-site) is built with [Docusaurus 2](https://docusaurus.io) and any update to the docs **here** will be synchronized **there**.

Therefore, to update the documentation, rather than contributing to the [website repo](https://github.com/fanux/sealos-site), you should contribute to this repo directly, unless you want to update the home page or custom pages like the [company page](https://www.sealos.io/company).

For a complete list of the docs synchronization mappings, see [sync_docs.yml](https://github.com/labring/sealos/tree/main/.github/sync_docs.yml).

#### Formatting

Please obey the following rules to better format the docs, which would greatly improve the reading experience.

1. Please do not use Chinese punctuations in English docs, and vice versa.
1. Please use upper case letters where applicable, like the first letter of sentences / headings, etc.
1. Please specify a language for each Markdown code blocks, unless there's no associated languages.
1. Please insert a whitespace between Chinese and English words.
1. Please use the correct case for technical terms, such as using HTTP instead of http, MySQL rather than mysql, Kubernetes instead of kubernetes, etc.
1. Please check if there's any typos in the docs before submitting PRs.

You can also check out the [Docusaurus docs](https://docusaurus.io/docs/markdown-features) to write docs with richer feature.

## Engage to help anything

We choose GitHub as the primary place for sealos to collaborate. So the latest updates of sealos are always here. Although contributions via PR is an explicit way to help, we still call for any other ways.

- reply to other's issues if you could;
- help solve other user's problems;
- help review other's PR design;
- help review other's codes in PR;
- discuss about sealos to make things clearer;
- advocate sealos technology beyond GitHub;
- write blogs on sealos and so on.

In a word, **ANY HELP IS CONTRIBUTION.**
