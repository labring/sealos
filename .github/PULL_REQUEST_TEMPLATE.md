---
name: 跳过CI的PR
about: 没有CI的提交，若需要CI则将标题的[SKIP CI]删掉即可
title: '[SKIP CI]seaols: 一句话简短描述该PR内容'
assignees: ''

---


```
<type>(<scop>): <subject>

<body>

<footer>
```



```
# type 字段包含:
# feat：新功能（feature）
# fix：修补bug
# docs：文档（documentation）
# style： 格式（不影响代码运行的变动）
# refactor：重构（即不是新增功能，也不是修改bug的代码变动）
# test：增加测试
# chore：构建过程或辅助工具的变动
# scope用于说明 commit 影响的范围，比如数据层、控制层、视图层等等。
# subject是 commit 目的的简短描述，不超过50个字符
# body 部分是对本次 commit 的详细描述，可以分成多行
# footer 用来关闭 Issue, eg. #163
```
