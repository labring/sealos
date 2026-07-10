# 隐藏 Brain 窗口标题栏

## 目标

当 desktop 打开 `system-brain` app 时，只渲染其 iframe，不渲染 desktop 窗口标题栏。标题栏不能因鼠标悬停或进入现有的顶部感应区域而再次出现。

## 改动范围

- 无论 `system-brain` 处于哪种窗口尺寸，都不渲染标题栏。
- 删除仅供 Brain 使用的顶部鼠标悬停感应区域和悬停状态。
- 让 Brain iframe 占满原本包含标题栏的窗口内容区域。
- 其他 app 的标题栏及其最小化、最大化/还原、关闭功能保持不变。
- 不为 Brain 增加替代的窗口控制按钮。

## 实现方案

在 `frontend/desktop/src/components/app_window/index.tsx` 中判断当前 app 是否为 Brain，仅为非 Brain app 渲染现有标题栏。删除不再需要的 `isHeaderHovered` 状态，以及顶部透明的 10px 鼠标悬停感应区域。

## 验证方案

- 通过组件测试验证 `system-brain` 不渲染 `.windowHeader`。
- 在同一组测试中验证非 Brain app 仍会渲染 `.windowHeader` 和三个窗口控制按钮。
- 运行定向测试，以及仓库现有的 desktop TypeScript 类型检查或同等的构建验证。
