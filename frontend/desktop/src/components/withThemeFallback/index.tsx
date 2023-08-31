import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

interface WithThemeFallbackProps {
  componentName: string;
  isDisplayed?: boolean;
  cache?: boolean;
}

const cachedComponents: { [key: string]: React.ComponentType<any> } = {};

export default function withThemeFallback(options: WithThemeFallbackProps) {
  const { componentName, cache = false, isDisplayed = true } = options;

  const ComponentWithThemeFallback = (props: any) => {
    if (!componentName || !isDisplayed) return null;

    let themePath = `components/${componentName}`;
    let defaultPath = `${componentName}`;
    const loadComponent = () =>
      import(`@/theme/${themePath}`).catch(() => import(`@/components/${defaultPath}`));

    const Component = dynamic(() => loadComponent(), { ssr: false });

    return (
      <Suspense fallback={null}>
        <Component {...props} />
      </Suspense>
    );
  };

  return ComponentWithThemeFallback;
}
