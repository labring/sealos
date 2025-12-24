import { Tag } from 'antd';
import React from 'react';

// Fix for "Tag cannot be used as a JSX component" lint error
const AnyTag = Tag as any;

interface StatusTagProps {
  color?: string;
  children: React.ReactNode;
}

export const StatusTag = ({ color, children }: StatusTagProps) => {
  return <AnyTag color={color}>{children}</AnyTag>;
};
