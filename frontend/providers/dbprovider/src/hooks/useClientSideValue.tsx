import { useEffect, useState } from 'react';

/**
 * Hook 用于检测组件是否在客户端挂载
 * 在服务器端和客户端初始渲染时返回 false
 * 在客户端挂载后（useEffect 执行后）返回 defaultValue
 * 这样可以避免 hydration 错误，同时允许客户端挂载后显示内容
 */
export function useClientSideValue(defaultValue: boolean): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 只在客户端挂载后设置为 true
    setIsClient(true);
  }, []);

  // 在服务器端和客户端首次渲染时返回 false
  // 在客户端挂载后返回 defaultValue
  return isClient ? defaultValue : false;
}
