import Image from 'next/image';

export default function Error(props: { imageUrl: string }) {
  const { imageUrl } = props;

  return <Image src={imageUrl} alt="err" width={240} height={240} />;
}
