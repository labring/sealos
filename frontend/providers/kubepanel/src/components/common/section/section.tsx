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
    <section className="w-full bg-white px-6 py-5 flex flex-col flex-wrap gap-4 rounded-lg border border-[#E8E8E8]">
      {children}
    </section>
  );
}
