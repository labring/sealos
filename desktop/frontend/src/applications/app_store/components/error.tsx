import Image from 'next/image';

function Error(props: { imageUrl: string }) {
  const { imageUrl } = props;

  return <Image src={imageUrl} alt="err" width={240} height={240} />;
}

export default Error;
