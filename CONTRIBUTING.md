# Contributing to sealos

It is warmly welcomed if you have interest to hack on sealos. First, we encourage this kind of willing very much. And here is a list of contributing guide for you.

## Topics

* [Reporting security issues](#reporting-security-issues)
* [Reporting general issues](#reporting-general-issues)
* [Code and doc contribution](#code-and-doc-contribution)
* [Engage to help anything](#engage-to-help-anything)

## Reporting security issues

Security issues are always treated seriously. As our usual principle, we discourage anyone to spread security issues. If you find a security issue of sealos, please do not discuss it in public and even do not open a public issue. Instead we encourage you to send us a private email to [admin@sealyun.com](mailto:admin@sealyun.com) to report this.

## Reporting general issues

To be honest, we regard every user of sealos as a very kind contributor. After experiencing sealos, you may have some feedback for the project. Then feel free to open an issue via [NEW ISSUE](https://github.com/fanux/sealos/issues/new/choose).

Since we collaborate project sealos in a distributed way, we appreciate **WELL-WRITTEN**, **DETAILED**, **EXPLICIT** issue reports. To make the communication more efficient, we wish everyone could search if your issue is an existing one in the searching list. If you find it existing, please add your details in comments under the existing issue instead of opening a brand new one.

To make the issue details as standard as possible, we setup an [ISSUE TEMPLATE](./.github/ISSUE_TEMPLATE) for issue reporters. You can find three kinds of issue templates there: question, bug report and feature request. Please **BE SURE** to follow the instructions to fill fields in template.

There are lot of cases when you could open an issue:

* bug report
* feature request
* performance issues
* feature proposal
* feature design
* help wanted
* doc incomplete
* test improvement
* any questions on project
* and so on

Also we must remind that when filing a new issue, please remember to remove the sensitive data from your post. Sensitive data could be password, secret key, network locations, private business data and so on.

## Code and doc contribution

Every action to make project sealos better is encouraged. On GitHub, every improvement for sealos could be via a PR (short for pull request).

* If you find a typo, try to fix it!
* If you find a bug, try to fix it!
* If you find some redundant codes, try to remove them!
* If you find some test cases missing, try to add them!
* If you could enhance a feature, please **DO NOT** hesitate!
* If you find code implicit, try to add comments to make it clear!
* If you find code ugly, try to refactor that!
* If you can help to improve documents, it could not be better!
* If you find document incorrect, just do it and fix that!
* ...

Actually it is impossible to list them completely. Just remember one princinple:

> WE ARE LOOKING FORWARD TO ANY PR FROM YOU.

Since you are ready to improve sealos with a PR, we suggest you could take a look at the PR rules here.

* [Workspace Preparation](#workspace-preparation)
* [Branch Definition](#branch-definition)
* [Commit Rules](#commit-rules)
* [PR Description](#pr-description)
* [Developing Environment](#developing-environment)
* [Golang Dependency Management](#golang-dependency-management)

### Workspace Preparation

To put forward a PR, we assume you have registered a GitHub ID. Then you could finish the preparation in the following steps:

1. **FORK** sealos to your repository. To make this work, you just need to click the button Fork in right-left of [fanux/sealos](https://github.com/fanux/sealos) main page. Then you will end up with your repository in `https://github.com/<your-username>/sealos`, in which `your-username` is your GitHub username.

1. **CLONE** your own repository to master locally. Use `git clone https://github.com/<your-username>/sealos.git` to clone repository to your local machine. Then you can create new branches to finish the change you wish to make.

1. **Set Remote** upstream to be `https://github.com/fanux/sealos.git` using the following two commands:

	```
	git remote add upstream https://github.com/fanux/sealos.git
	git remote set-url --push upstream no-pushing
	```

	With this remote setting, you can check your git remote configuration like this:

	```
	$ git remote -v
	origin     https://github.com/<your-username>/sealos.git (fetch)
	origin     https://github.com/<your-username>/sealos.git (push)
	upstream   https://github.com/alibaba/sealos.git (fetch)
	upstream   no-pushing (push)
	```

	Adding this, we can easily synchronize local branches with upstream branches.

1. **Create a branch** to add a new feature or fix issues

    Update local working directory and remote forked repository:

   ```
   cd sealos
   git fetch upstream
   git checkout main
   git rebase upstream/main
   git push	// default origin, update your forked repository
   ```

   Create a new branch:

   ```
   git checkout -b <new-branch>
   ```

   Make any change on the `new-branch` then build and test your codes.

1. **Push your branch** to your forked repository, try not to generate multiple commit message within a pr.

   ```
   golangci-lint run -c .golangci.yml	// lint
   git commit -a -m "message for your changes"	// -a is git add .
   git rebase -i	<commit-id>// do this if your pr has multiple commits
   git push	// push to your forked repository after rebase done
   ```

1. **File a pull request** to fanux/sealos:master

### Branch Definition

Right now we assume every contribution via pull request is for [branch master](https://github.com/fanux/sealos/tree/master) in sealos. Before contributing, be aware of branch definition would help a lot.

As a contributor, keep in mind again that every contribution via pull request is for branch master. While in project sealos, there are several other branches, we generally call them rc branches, release branches and backport branches.

Before officially releasing a version, we will checkout a rc(release candidate) branch. In this branch, we will test more than branch main.

When officially releasing a version, there will be a release branch before tagging. After tagging, we will delete the release branch.

When backporting some fixes to existing released version, we will checkout backport branches. After backporting, the backporting effects will be in PATCH number in MAJOR.MINOR.PATCH of [SemVer](http://semver.org/).

### Commit Rules

Actually in sealos, we take two rules serious when committing:

* [Commit Message](#commit-message)
* [Commit Content](#commit-content)

#### Commit Message

Commit message could help reviewers better understand what the purpose of submitted PR is. It could help accelerate the code review procedure as well. We encourage contributors to use **EXPLICIT** commit message rather than ambiguous message. In general, we advocate the following commit message type:

* docs: xxxx. For example, "docs: add docs about storage installation".
* feature: xxxx.For example, "feature: make result show in sorted order".
* bugfix: xxxx. For example, "bugfix: fix panic when input nil parameter".
* style: xxxx. For example, "style: format the code style of Constants.java".
* refactor: xxxx. For example, "refactor: simplify to make codes more readable".
* test: xxx. For example, "test: add unit test case for func InsertIntoArray".
* chore: xxx. For example, "chore: integrate travis-ci". It's the type of mantainance change.
* other readable and explicit expression ways.

On the other side, we discourage contributors from committing message like the following ways:

* ~~fix bug~~
* ~~update~~
* ~~add doc~~

#### Commit Content

Commit content represents all content changes included in one commit. We had better include things in one single commit which could support reviewer's complete review without any other commits' help. In another word, contents in one single commit can pass the CI to avoid code mess. In brief, there are two minor rules for us to keep in mind:

* avoid very large change in a commit;
* complete and reviewable for each commit.

No matter what the commit message, or commit content is, we do take more emphasis on code review.

### PR Description

PR is the only way to make change to sealos project files. To help reviewers better get your purpose, PR description could not be too detailed. We encourage contributors to follow the [PR template](./.github/PULL_REQUEST_TEMPLATE.md) to finish the pull request.

### Developing Environment

As a contributor, if you want to make any contribution to sealos project, we should reach an agreement on the version of tools used in the development environment.
Here are some dependents with specific version:

* golang : v1.13
* golangci-lint: 1.39.0

When you develop the sealos project at the local environment, you should use subcommands of Makefile to help yourself to check and build the latest version of sealos. For the convenience of developers, we use the docker to build sealos. It can reduce problems of the developing environment.

## Engage to help anything

We choose GitHub as the primary place for sealos to collaborate. So the latest updates of sealos are always here. Although contributions via PR is an explicit way to help, we still call for any other ways.

* reply to other's issues if you could;
* help solve other user's problems;
* help review other's PR design;
* help review other's codes in PR;
* discuss about sealos to make things clearer;
* advocate sealos technology beyond GitHub;
* write blogs on sealos and so on.

In a word, **ANY HELP IS CONTRIBUTION.**
