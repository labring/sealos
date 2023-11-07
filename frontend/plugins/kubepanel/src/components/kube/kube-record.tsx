interface KubeRecordProps {
  name: React.ReactNode;
  value?: React.ReactNode;
  hidden?: boolean;
  color?: { nameColor: string; valueColor: string };
  padding?: boolean;
}

export const KubeRecord = ({
  name,
  value,
  hidden = false,
  color,
  padding = true
}: KubeRecordProps) => {
  if (hidden) return null;
  const { nameColor = '#727272', valueColor = '#555555' } = color ?? {};

  return (
    <div
      className={`grid border-b border-solid border-zinc-400 ${
        padding ? 'py-2' : ''
      } last:border-b-0`}
      style={{ gridTemplateColumns: 'minmax(30%, min-content) auto' }}
    >
      <span style={{ color: nameColor }} className="pr-1 overflow-hidden text-ellipsis font-bold">
        {name}
      </span>
      <span style={{ color: valueColor }} className="max-w-full min-w-0">
        {value}
      </span>
    </div>
  );
};
