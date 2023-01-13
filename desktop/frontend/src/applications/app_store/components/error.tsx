import Image from 'next/image';

function Error() {
  return <Image src={'/images/appstore/error.svg'} alt="err" width={240} height={240} />;
}

export default Error;
