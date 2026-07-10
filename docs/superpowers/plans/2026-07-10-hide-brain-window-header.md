# 隐藏 Brain 窗口标题栏实施计划

> **给执行者：** 必须使用 `superpowers:executing-plans`，逐项完成并验证本计划。

**目标：** `system-brain` 的 iframe 窗口永不渲染 desktop 标题栏，其他 app 的窗口标题栏与控制按钮保持不变。

**架构：** 保留统一的 `AppWindow` 组件，在该组件的渲染层根据 app key 决定是否创建标题栏 DOM。删除 Brain 专用的悬停状态和顶部感应区，不增加新的组件抽象或替代控制按钮。

**技术栈：** React 18、React DOM Server、TypeScript、Chakra UI、Zustand、Vitest。

## 全局约束

- Brain 的准确 app key 为 `system-brain`。
- Brain 在所有窗口尺寸下都不能渲染标题栏。
- 其他 app 的标题栏及其最小化、最大化/还原、关闭功能不能改变。
- 不通过 CSS 隐藏；标题栏节点必须不存在于 DOM 中。
- 不为 Brain 增加替代窗口控制按钮。

---

### 任务 1：用组件测试固定窗口标题栏行为

**文件：**

- 新建：`frontend/desktop/src/__tests__/unit/components/app-window.test.tsx`
- 修改：`frontend/desktop/src/components/app_window/index.tsx`

**接口：**

- 输入：由 `useAppStore().findAppInfoById(pid)` 返回、包含 `key` 字段的 app 窗口信息。
- 输出：Brain 窗口不包含 `.windowHeader`；非 Brain 窗口仍包含 `.windowHeader` 和三个 `.uicon` 控制按钮。

- [x] **步骤 1：添加失败的 Brain 组件测试和非 Brain 回归测试**

在测试中模拟 store、翻译和拖拽容器，通过 `renderToStaticMarkup` 渲染真实 `AppWindow`：

```tsx
test.each<WindowSize>(["maximize", "maxmin", "minimize"])(
  "system-brain 在 %s 状态下不渲染窗口标题栏",
  (size) => {
    currentApp = createApp("system-brain", size);
    const html = renderToStaticMarkup(
      <AppWindow pid={1}>Brain content</AppWindow>
    );

    expect(html).not.toContain("windowHeader");
    expect(html).toContain("Brain content");
  }
);

test("非 Brain app 保留窗口标题栏和三个窗口控制按钮", () => {
  currentApp = createApp("system-devbox", "maximize");
  const html = renderToStaticMarkup(
    <AppWindow pid={1}>Devbox content</AppWindow>
  );

  expect(html).toContain("windowHeader");
  expect(html.match(/_uicon_/g)).toHaveLength(3);
  expect(html).toContain('data-type="close"');
});
```

- [x] **步骤 2：运行测试并确认 Brain 用例按预期失败**

运行：

```bash
cd frontend
cd desktop
./node_modules/.bin/vitest run --project unit app-window.test.tsx
```

预期：三个 Brain 窗口尺寸用例均失败，因为当前实现仍然创建 `.windowHeader`；非 Brain 回归用例通过。

- [x] **步骤 3：实施最小渲染改动**

在 `AppWindow` 中复用已有的 Brain key 常量：

```tsx
import useAppStore, { BRAIN_APP_KEY } from "@/stores/app";
```

删除 `isHeaderHovered` 状态与 Brain 顶部 10px 感应区，并将现有标题栏包裹在以下条件中：

```tsx
{
  wnapp.key !== BRAIN_APP_KEY && (
    <Flex className="windowHeader">{/* 保留现有标题栏内容和事件处理 */}</Flex>
  );
}
```

标题栏内部的非 Brain 行为不做其他调整。

- [x] **步骤 4：运行定向测试并确认通过**

运行：

```bash
cd frontend
cd desktop
./node_modules/.bin/vitest run --project unit app-window.test.tsx
```

预期：四个用例全部通过，Vitest 正常退出且没有测试错误。

- [ ] **步骤 5：运行 desktop 类型检查和完整单元测试**

运行：

```bash
cd frontend
pnpm exec tsc --noEmit -p desktop/tsconfig.json
pnpm --filter desktop test:ci
```

预期：TypeScript 无错误；desktop 完整单元测试全部通过。

执行记录：已运行；当前沙箱无法联网下载 Prisma engine，且 workspace 包链接不完整，因此全量验证被环境初始化问题阻塞。定向测试不依赖这些缺失产物并已通过。

- [ ] **步骤 6：检查差异并提交**

运行：

```bash
git diff --check
git diff -- frontend/desktop/src/components/app_window/index.tsx frontend/desktop/src/__tests__/unit/components/app-window.test.tsx
git add frontend/desktop/src/components/app_window/index.tsx frontend/desktop/src/__tests__/unit/components/app-window.test.tsx docs/superpowers/plans/2026-07-10-hide-brain-window-header.md
git commit -m "feat(desktop): hide Brain window header"
```

预期：差异只包含计划、组件测试和 Brain 标题栏条件渲染，没有无关改动。
