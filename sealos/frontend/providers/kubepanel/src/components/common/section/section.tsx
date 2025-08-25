interface SectionProps {
  children: React.ReactNode;
}

/**
 * Renders a section component with the provided children.
 *
 * @param {SectionProps} children - The children to render within the section.
 * @return {JSX.Element} The rendered section component.
 */
export function Section({ children }: SectionProps) {
  return (
    <section className="w-full bg-white px-10 py-8 flex flex-col flex-wrap gap-3 rounded-lg	">
      {children}
    </section>
  );
}
