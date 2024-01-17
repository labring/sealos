import { Checkbox, Flex, Link, Text, TextProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

const useProtocol = ({
  service_protocol,
  private_protocol
}: {
  service_protocol: string;
  private_protocol: string;
}) => {
  const { t, i18n } = useTranslation();
  const [isAgree, setIsAgree] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  const Protocol = () => (
    <Flex
      className="protocol"
      w="266px"
      alignItems={'center'}
      mb={'16px'}
      width="266px"
      minH="42px"
      borderRadius="4px"
      p="10px"
    >
      <Checkbox
        isInvalid={isInvalid}
        mr={'8px'}
        isChecked={isAgree}
        variant={'unstyled'}
        onChange={(e) => {
          setIsInvalid(false);
          setIsAgree(e.target.checked);
        }}
      />
      <Text fontStyle="normal" fontWeight="400" fontSize="12px" lineHeight="140%" color="#FFFFFF">
        {t('agree policy')}
        <Link
          href={service_protocol}
          _hover={{
            color: 'rgba(94, 189, 242, 1)',
            borderBottom: '1px solid rgba(94, 189, 242, 1)'
          }}
          px="4px"
        >
          {t('Service Agreement')}
        </Link>
        {t('and')}
        <Link
          href={private_protocol}
          _hover={{
            color: 'rgba(94, 189, 242, 1)',
            borderBottom: '1px solid rgba(94, 189, 242, 1)'
          }}
          px="4px"
        >
          {t('Privacy Policy')}
        </Link>
      </Text>
    </Flex>
  );
  return {
    Protocol,
    isAgree,
    setIsInvalid
  };
};

export default useProtocol;
