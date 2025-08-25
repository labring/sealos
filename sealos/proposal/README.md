# Proposing Changes to sealos

## Introduction

Here presents the sealos project's development process.
Significant changes to the core, cloud or commands
(both contains the command-line-interface as well as the graphical-user-interface),
must be first discussed, and sometimes formally documented, before they can be implemented.

This directory contains proposing, documenting, and implementing changes to the sealos project.

To learn more about how proposal development process works, see the references:
> [Go Proposal](https://talks.golang.org/2015/how-go-was-made.slide)\
> [Kubernetes Enhancement Proposals](https://github.com/kubernetes/enhancements)

## The Proposal Process

Here comes the proposal process: `create`,`discuss` or `decline`,`review`,`accept`.

1. Create. The proposal author [create a brief issue](https://github.com/labring/sealos/issues/new?template=feature.md&title=Feature%3A+brief+description+of+the+feature) witch describe the proposal.\
   Note: There is no need for details or designs at this point.\
   Note: If can, users can specific it is core or cloud based feature.

2. Discuss. This issue tracks as many discussions to make a proposal deals with some key point keep in mind:
    - Keep simple as base requirement;
    - One feature takes all;
    - Stability and scalability as possible;

   Here must have agreements to make process go on, otherwise the discussion will mark as `decline` and process stops.

3. Review. The proposal author(or with some one's help) writes a conclusion comment to work out details of the proposed design and others will review it.

4. Accept. Once comments and revisions on the issue is closed, there must came with a final document with the full proposal messages.

After the proposal is accepted, implementation work proceeds goes on.

## FAQs

### Example:

1. [1527-user-controller](https://github.com/labring/sealos/issues/1527)
2. [1660-cloud-init](https://github.com/labring/sealos/issues/1660)
3. [1873-gateway](https://github.com/labring/sealos/issues/1873)
4. [1902-image-app-hub](https://github.com/labring/sealos/issues/1902)

### Help

As proposal process is just from a starter stage, if something is missing or not cleared here, feel free to open new issues to discuss the proposal process1

## Specials

The sealos proposal process, as described above, was essentially stolen from the [Kubernetes KEP process](https://github.com/kubernetes/enhancements), witch essentially stolen from [Rust RFC process](https://github.com/rust-lang/rfcs) which itself resembles the [Python PEP process](https://www.python.org/dev/peps/pep-0001/).