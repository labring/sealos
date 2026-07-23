interface PageTitleProps {
  children: string | string[];
  className?: string;
  type: 'primary' | 'secondary' | 'table';
}

const titleClassName: Record<PageTitleProps['type'], string> = {
  primary: 'text-2xl font-medium',
  secondary: 'text-xl font-medium',
  table: 'text-xs font-medium text-gray-500'
};

/**
 * Renders a title component with the specified type and children.
 *
 * @param {PageTitleProps} props - The properties of the title component.
 * @param {ReactNode} props.children - The content of the title component.
 * @param {string} props.type - The type of the title component.
 * @return {JSX.Element} The rendered title component.
 */
export default function Title({ children, type, className }: PageTitleProps) {
  return (
    <div className={className}>
      <span className={titleClassName[type]}>{children}</span>
    </div>
  );
}
