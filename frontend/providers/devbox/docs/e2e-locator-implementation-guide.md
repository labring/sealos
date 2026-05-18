# DevBox E2E 元素定位实现说明

本文档用于给测试同学编写 DevBox 自动化用例时作为元素定位依据。当前实现已经在 DevBox 主流程中补充了稳定的 `data-testid`，测试代码可以在“用户语义定位”和“测试专用定位”之间按规则选择。

## 目标

这次实现的目标不是改业务逻辑，而是给 E2E 测试提供稳定的元素语义契约：

- 测试用例不要依赖 Tailwind class、DOM 层级、组件库内部结构。
- 可通过按钮文本、输入框 label、Tab 名称等用户语义定位时，优先使用语义定位。
- 当文案重复、图标按钮、状态断言、列表行内操作等场景不稳定时，使用 `data-testid`。
- `data-testid` 命名保持业务语义稳定，不包含动态资源名、行号、生成 ID。

## 定位优先级

推荐测试框架按以下顺序定位元素：

1. **语义定位优先**

   - 按 button role + 按钮名称定位。
   - 按 input label、placeholder、accessible name 定位。
   - 按 Tab、Dialog、Menu 等可访问语义定位。

2. **使用 `data-testid` 作为稳定锚点**

   - 重复按钮，例如列表行内多个“删除”“详情”“发版”。
   - 图标按钮，例如更多操作、返回、复制。
   - 状态、错误提示、空状态、分页、弹窗、表格行。
   - 文案可能被国际化影响的关键控件。

3. **避免 DOM/CSS 选择器**
   - 不要用 `className` 写自动化定位。
   - 不要依赖 `div:nth-child(...)` 这类结构选择器。
   - `id` 只用于表单语义或页面锚点，不作为默认测试契约。

## 命名规则

`data-testid` 使用小写点分结构：

```text
<页面或功能>.<区域>.<对象>.<动作或字段>
```

示例：

```text
devbox-list.search-input
devbox-list.item.status
devbox-create.network.port-input
devbox-detail.ssh.private-key-button
devbox-release.submit-button
devbox-delete.confirm-button
```

重复列表项不要把动态名称放入 `data-testid`。例如 DevBox 列表行统一是：

```text
devbox-list.item
```

测试时先通过可见名称筛选对应行，再在行内找目标元素：

```ts
const row = page.getByTestId('devbox-list.item').filter({ hasText: 'db-e2e-01' });
await expect(row.getByTestId('devbox-list.item.status')).toBeVisible();
```

## 已覆盖范围

### DevBox 列表页

用于搜索、创建入口、模板入口、空状态、列表行字段、行内操作、分页等用例。

| 场景             | `data-testid`                      |
| ---------------- | ---------------------------------- |
| 搜索框           | `devbox-list.search-input`         |
| 文档入口         | `devbox-list.docs-link`            |
| 浏览模板按钮     | `devbox-list.template-button`      |
| 新建 DevBox 按钮 | `devbox-list.create-button`        |
| 创建方式菜单     | `devbox-list.create-menu`          |
| 从模板创建       | `devbox-list.create-from-template` |
| 从 Git 导入      | `devbox-list.import-from-git`      |
| 从本地导入       | `devbox-list.import-from-local`    |
| 列表行           | `devbox-list.item`                 |
| 行内名称         | `devbox-list.item.name`            |
| 行内备注         | `devbox-list.item.remark`          |
| 备注编辑入口     | `devbox-list.item.remark-edit`     |
| 行内状态         | `devbox-list.item.status`          |
| 行内创建时间     | `devbox-list.item.create-time`     |
| 详情按钮         | `devbox-list.item.detail-button`   |
| 更多操作按钮     | `devbox-list.item.actions-button`  |
| 发版操作         | `devbox-list.item.release-action`  |
| 更新配置操作     | `devbox-list.item.update-action`   |
| 启动操作         | `devbox-list.item.start-action`    |
| 重启操作         | `devbox-list.item.restart-action`  |
| 暂停操作         | `devbox-list.item.pause-action`    |
| 删除操作         | `devbox-list.item.delete-action`   |
| 无 DevBox 空状态 | `devbox-list.empty`                |
| 搜索无结果状态   | `devbox-list.search-empty`         |
| 分页区域         | `devbox-list.pagination`           |

列表行推荐写法：

```ts
const row = page.getByTestId('devbox-list.item').filter({ hasText: 'db-e2e-01' });
await expect(row.getByTestId('devbox-list.item.name')).toContainText('db-e2e-01');
await row.getByTestId('devbox-list.item.actions-button').click();
await row.getByTestId('devbox-list.item.restart-action').click();
```

### 模板选择页

用于模板 Tab、模板搜索、分类筛选、模板卡片、版本选择、选择按钮、私有模板删除等用例。

| 场景             | `data-testid`                       |
| ---------------- | ----------------------------------- |
| Tab 容器         | `template-page.tabs`                |
| 所有模板 Tab     | `template-page.tab.public`          |
| 我的模板 Tab     | `template-page.tab.private`         |
| 模板搜索框       | `template-page.search-input`        |
| 返回按钮         | `template-page.back-button`         |
| 所有模板内容区   | `template-page.public-content`      |
| 我的模板内容区   | `template-page.private-content`     |
| 官方分类         | `template-page.category.official`   |
| 语言分类         | `template-page.category.language`   |
| 框架分类         | `template-page.category.framework`  |
| OS 分类          | `template-page.category.os`         |
| MCP 分类         | `template-page.category.mcp`        |
| 非官方分类       | `template-page.category.unofficial` |
| 分类下二级筛选项 | `template-page.category-filter`     |
| 分页区域         | `template-page.pagination`          |
| 空状态           | `template-page.empty`               |
| 模板卡片         | `template-card`                     |
| 模板名称         | `template-card.name`                |
| 版本下拉         | `template-card.version-select`      |
| 选择按钮         | `template-card.select-button`       |
| 卡片更多操作     | `template-card.actions-button`      |
| 删除模板操作     | `template-card.delete-action`       |

模板卡片推荐写法：

```ts
const card = page.getByTestId('template-card').filter({ hasText: 'Python-Official' });
await card.getByTestId('template-card.version-select').click();
await card.getByTestId('template-card.select-button').click();
```

### 创建与更新配置页

用于名称、资源、GPU、存储、网络、Shared Memory、提交等用例。

| 场景                   | `data-testid`                                 |
| ---------------------- | --------------------------------------------- |
| 表单 Tab               | `devbox-create.form-tab`                      |
| YAML Tab               | `devbox-create.yaml-tab`                      |
| 提交按钮               | `devbox-create.submit-button`                 |
| Runtime 区域           | `devbox-create.runtime-section`               |
| DevBox 名称输入框      | `devbox-create.name-input`                    |
| 资源配置区             | `devbox-create.usage-section`                 |
| CPU Slider             | `devbox-create.cpu-slider`                    |
| Memory Slider          | `devbox-create.memory-slider`                 |
| GPU 下拉               | `devbox-create.gpu-select`                    |
| GPU 数量选项           | `devbox-create.gpu-amount-option`             |
| 存储区域               | `devbox-create.storage-section`               |
| 添加存储按钮           | `devbox-create.storage.add-button`            |
| 存储项                 | `devbox-create.storage.item`                  |
| 编辑存储按钮           | `devbox-create.storage.edit-button`           |
| 删除存储按钮           | `devbox-create.storage.delete-button`         |
| 网络配置区             | `devbox-create.network-section`               |
| 添加端口按钮           | `devbox-create.network.add-port-button`       |
| 端口项                 | `devbox-create.network.port-item`             |
| 容器端口输入框         | `devbox-create.network.port-input`            |
| 公网访问开关           | `devbox-create.network.public-switch`         |
| 协议下拉               | `devbox-create.network.protocol-select`       |
| 默认公网域名展示       | `devbox-create.network.public-domain`         |
| 自定义域名按钮         | `devbox-create.network.custom-domain-button`  |
| 删除端口按钮           | `devbox-create.network.delete-port-button`    |
| 高级配置区             | `devbox-create.advanced-section`              |
| Shared Memory 区域     | `devbox-create.shared-memory-section`         |
| Shared Memory 开关     | `devbox-create.shared-memory.switch`          |
| Shared Memory 减少按钮 | `devbox-create.shared-memory.decrease-button` |
| Shared Memory 数值     | `devbox-create.shared-memory.size-value`      |
| Shared Memory 增加按钮 | `devbox-create.shared-memory.increase-button` |

端口项推荐写法：

```ts
await page.getByTestId('devbox-create.network.add-port-button').click();
const portItem = page.getByTestId('devbox-create.network.port-item').last();
await portItem.getByTestId('devbox-create.network.port-input').fill('8080');
await portItem.getByTestId('devbox-create.network.public-switch').click();
await expect(portItem.getByTestId('devbox-create.network.public-domain')).toBeVisible();
```

### DevBox 详情页

用于详情页标题、状态、生命周期按钮、SSH 信息、网络地址、Tab 切换等用例。

| 场景           | `data-testid`                               |
| -------------- | ------------------------------------------- |
| 返回按钮       | `devbox-detail.back-button`                 |
| 标题名称       | `devbox-detail.title`                       |
| 状态           | `devbox-detail.status`                      |
| 删除按钮       | `devbox-detail.delete-button`               |
| Terminal 按钮  | `devbox-detail.terminal-button`             |
| 启动按钮       | `devbox-detail.start-button`                |
| 暂停按钮       | `devbox-detail.pause-button`                |
| 更新配置按钮   | `devbox-detail.update-button`               |
| 重启按钮       | `devbox-detail.restart-button`              |
| 总览 Tab       | `devbox-detail.tab.overview`                |
| 监控 Tab       | `devbox-detail.tab.monitor`                 |
| 高级配置 Tab   | `devbox-detail.tab.advanced-config`         |
| 基础信息区     | `devbox-detail.basic-section`               |
| 基础信息项     | `devbox-detail.basic.item`                  |
| 基础信息项标签 | `devbox-detail.basic.item-label`            |
| 基础信息项值   | `devbox-detail.basic.item-value`            |
| SSH 命令       | `devbox-detail.ssh.command`                 |
| 复制 SSH 命令  | `devbox-detail.ssh.copy-command`            |
| 下载私钥按钮   | `devbox-detail.ssh.private-key-button`      |
| 一键配置按钮   | `devbox-detail.ssh.one-click-config-button` |
| 最近事件       | `devbox-detail.last-event`                  |
| 网络区域       | `devbox-detail.network-section`             |
| 网络管理按钮   | `devbox-detail.network.manage-button`       |
| 网络行         | `devbox-detail.network.item`                |
| 外部访问地址   | `devbox-detail.network.external-address`    |

基础信息推荐写法：

```ts
await expect(page.getByTestId('devbox-detail.title')).toHaveText('db-e2e-01');

const createTimeItem = page
  .getByTestId('devbox-detail.basic.item')
  .filter({
    has: page.getByTestId('devbox-detail.basic.item-label').filter({ hasText: '创建时间' })
  });
await expect(createTimeItem.getByTestId('devbox-detail.basic.item-value')).not.toBeEmpty();
```

### IDE 入口

用于运行中打开 IDE、停止态按钮禁用、IDE 下拉选择等用例。

| 场景              | `data-testid`            |
| ----------------- | ------------------------ |
| 打开当前 IDE 按钮 | `devbox-ide.open-button` |
| IDE 菜单按钮      | `devbox-ide.menu-button` |
| IDE 菜单          | `devbox-ide.menu`        |
| IDE 选项          | `devbox-ide.option`      |

### 发版 Release

用于发版弹窗、版本号校验、Release 状态、部署、转模板、删除版本等用例。

| 场景           | `data-testid`                          |
| -------------- | -------------------------------------- |
| Release 区域   | `devbox-release.section`               |
| Release 弹窗   | `devbox-release.dialog`                |
| 打开发版按钮   | `devbox-release.open-button`           |
| 无版本空状态   | `devbox-release.empty`                 |
| Release 行     | `devbox-release.item`                  |
| 版本号         | `devbox-release.item.tag`              |
| 状态           | `devbox-release.item.status`           |
| 描述           | `devbox-release.item.description`      |
| 编辑描述       | `devbox-release.item.description-edit` |
| 部署按钮       | `devbox-release.item.deploy-button`    |
| 更多操作按钮   | `devbox-release.item.actions-button`   |
| 转换为模板操作 | `devbox-release.item.convert-template` |
| 删除版本操作   | `devbox-release.item.delete-action`    |
| 镜像输入框     | `devbox-release.image-input`           |
| 版本号输入框   | `devbox-release.tag-input`             |
| 描述输入框     | `devbox-release.description-input`     |
| 自动启动复选框 | `devbox-release.auto-start-checkbox`   |
| 取消按钮       | `devbox-release.cancel-button`         |
| 提交按钮       | `devbox-release.submit-button`         |

Release 行推荐写法：

```ts
const release = page.getByTestId('devbox-release.item').filter({ hasText: 'v2.0.0' });
await expect(release.getByTestId('devbox-release.item.status')).toContainText('Pending');
await release.getByTestId('devbox-release.item.deploy-button').click();
```

### 删除与备注

用于删除确认、名称输入确认、备注编辑保存、备注失败提示等用例。

| 场景           | `data-testid`                  |
| -------------- | ------------------------------ |
| 删除弹窗       | `devbox-delete.dialog`         |
| 删除风险提示   | `devbox-delete.warning`        |
| 删除名称输入框 | `devbox-delete.name-input`     |
| 删除取消按钮   | `devbox-delete.cancel-button`  |
| 删除确认按钮   | `devbox-delete.confirm-button` |
| 备注弹窗       | `devbox-remark.dialog`         |
| 备注输入框     | `devbox-remark.input`          |
| 备注取消按钮   | `devbox-remark.cancel-button`  |
| 备注提交按钮   | `devbox-remark.submit-button`  |

删除确认推荐写法：

```ts
await page.getByTestId('devbox-detail.delete-button').click();
await expect(page.getByTestId('devbox-delete.dialog')).toBeVisible();
await expect(page.getByTestId('devbox-delete.confirm-button')).toBeDisabled();
await page.getByTestId('devbox-delete.name-input').fill('db-e2e-01');
await expect(page.getByTestId('devbox-delete.confirm-button')).toBeEnabled();
```

## 编写用例建议

### 1. 列表行、Release 行、模板卡片先定位容器

重复结构不要直接全局找按钮。先定位具体业务对象，再在容器内找操作。

```ts
const row = page.getByTestId('devbox-list.item').filter({ hasText: 'db-e2e-01' });
await row.getByTestId('devbox-list.item.detail-button').click();
```

### 2. 断言状态时优先断言稳定锚点

例如状态、空态、最近事件、错误弹窗，都应基于对应 `data-testid`。

```ts
await expect(page.getByTestId('devbox-detail.status')).toContainText('运行中');
await expect(page.getByTestId('devbox-detail.last-event')).toContainText('PermissionDenied');
```

### 3. 文案变化风险高的场景用 `data-testid`

按钮文案、状态文案可能受 i18n 影响。测试如果只验证行为入口，建议用 `data-testid`；如果用例本身就是验证文案，则再断言文本。

### 4. 不要用样式 class 定位

以下写法不推荐：

```ts
page.locator('.guide-release-button').click();
page.locator('.devboxListItem').first();
```

推荐改为：

```ts
page.getByTestId('devbox-release.open-button').click();
page.getByTestId('devbox-list.item').first();
```

## 维护规则

后续新增或调整 DevBox UI 时，按以下规则维护：

- 新增 P0/P1 自动化覆盖的控件，需要同步补 `data-testid`。
- 新增重复列表、表格、卡片结构时，容器和行内关键操作都要有稳定锚点。
- 改 UI 样式或布局时，不要随意改已有 `data-testid`。
- 确实需要重命名时，应先和测试同学同步，并批量更新测试代码。
- 新增锚点后，同步更新 `docs/e2e-locators.md` 和本文档。

## 本次实现涉及文件

核心文档：

- `docs/e2e-locators.md`
- `docs/e2e-locator-implementation-guide.md`

主要页面与组件：

- `app/[lang]/(platform)/(home)/components/*`
- `app/[lang]/(platform)/template/*`
- `app/[lang]/(platform)/devbox/create/components/*`
- `app/[lang]/(platform)/devbox/detail/[name]/components/*`
- `components/IDEButton.tsx`
- `components/dialogs/ReleaseDialog.tsx`
- `components/dialogs/DeleteDevboxDialog.tsx`
- `components/dialogs/EditRemarkDialog.tsx`
