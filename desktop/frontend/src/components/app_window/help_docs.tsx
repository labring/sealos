import Image from 'next/image';

export default function HelpDocs() {
  return (
    <div>
      <Image
        className="ml-4  cursor-pointer"
        src="/images/infraicon/scp_help.svg"
        width={16}
        height={16}
        alt="help"
        onClick={() => {
          window.open('https://www.sealos.io/docs/Intro');
        }}
      />
    </div>
  );
}
