import Image from 'next/image';

type TDocs = {
  url: string;
};

export default function HelpDocs(props: TDocs) {
  const { url } = props;
  return (
    <div>
      <Image
        className="ml-4  cursor-pointer"
        src="/images/infraicon/scp_help.svg"
        width={16}
        height={16}
        alt="help"
        onClick={() => {
          window.open(url);
        }}
      />
    </div>
  );
}
