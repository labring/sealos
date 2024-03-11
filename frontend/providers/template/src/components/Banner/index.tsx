import { Box, Center, Flex, Image, Text } from '@chakra-ui/react';
import { useRef } from 'react';
import 'swiper/css';
import { Autoplay } from 'swiper/modules';
import { Swiper, SwiperRef, SwiperSlide } from 'swiper/react';
import { ArrowRightIcon } from '../icons/ArrowRight';
import { useSystemConfigStore } from '@/store/config';
import { useRouter } from 'next/router';
import { SlideDataType } from '@/types/app';
import React from 'react';

const Card = ({ item, onClick }: { item: SlideDataType; onClick: () => void }) => {
  return (
    <Flex
      cursor={'pointer'}
      flex={1}
      bg={item.bg}
      borderRadius={item.borderRadius}
      p="16px 24px"
      justifyContent={'space-between'}
      onClick={onClick}
      gap={'36px'}
    >
      <Flex flexDirection={'column'} justifyContent={'space-between'}>
        <Flex gap="12px" alignItems={'center'} mt="26px">
          <Center
            w={'36px'}
            h={'36px'}
            boxShadow={'0px 1px 2px 0.5px rgba(84, 96, 107, 0.20)'}
            borderRadius={'4px'}
            backgroundColor={'#fff'}
            border={' 1px solid rgba(255, 255, 255, 0.50)'}
          >
            <Image src={item.icon} alt="logo" width={'24px'} height={'24px'} />
          </Center>
          <Text fontSize={'20px'} color={'#FFF'} fontWeight={600}>
            {item.title}
          </Text>
        </Flex>
        <Text noOfLines={2} mb="26px" fontSize={'16px'} color={'#FFF'} fontWeight={600}>
          {item.desc}
        </Text>
      </Flex>

      <Image
        alignSelf={'center'}
        w={'226px'}
        height={'150px'}
        src={item.image}
        alt={`slide-${item.templateName}`}
      />
    </Flex>
  );
};

export default React.memo(function Banner() {
  const swiperRef = useRef<SwiperRef>(null);
  const { systemConfig } = useSystemConfigStore();
  const router = useRouter();

  const handlePrev = () => {
    if (swiperRef.current) {
      swiperRef.current?.swiper.slidePrev();
    }
  };

  const handleNext = () => {
    if (swiperRef.current) {
      swiperRef.current?.swiper.slideNext();
    }
  };

  const goDeploy = (name: string) => {
    if (!name) return;
    router.push({
      pathname: '/deploy',
      query: {
        templateName: name
      }
    });
  };

  if (!systemConfig?.showCarousel) {
    return null;
  }

  return (
    <Box
      minW={'960px'}
      h="213px"
      mb="24px"
      position={'relative'}
      _hover={{
        '.my-prev-button, .my-next-button': {
          opacity: 1
        }
      }}
    >
      <Swiper
        ref={swiperRef}
        slidesPerView={1}
        spaceBetween={30}
        loop={true}
        pagination={{
          clickable: true
        }}
        modules={[Autoplay]}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false
        }}
      >
        {systemConfig?.slideData.map((item, index) => (
          <SwiperSlide key={index}>
            <Flex w="full" h="213px" gap={'16px'} overflow={'hidden'}>
              <Card item={item} onClick={() => goDeploy(item.templateName)} />
              <Card
                item={systemConfig?.slideData[(index + 1) % systemConfig?.slideData.length]}
                onClick={() =>
                  goDeploy(
                    (systemConfig?.slideData[(index + 1) % systemConfig?.slideData.length])
                      .templateName
                  )
                }
              />
            </Flex>
          </SwiperSlide>
        ))}
      </Swiper>
      <Box
        transition="opacity 0.3s"
        opacity={0}
        cursor={'pointer'}
        className="my-prev-button"
        onClick={handlePrev}
        position={'absolute'}
        zIndex={10}
        top="50%"
        left="-30px"
        transform="translateY(-50%) rotate(180deg)"
      >
        <ArrowRightIcon />
      </Box>
      <Box
        transition="opacity 0.3s"
        opacity={0}
        cursor={'pointer'}
        className="my-next-button"
        onClick={handleNext}
        position={'absolute'}
        zIndex={10}
        top="50%"
        right="-30px"
        transform="translateY(-50%)"
      >
        <ArrowRightIcon />
      </Box>
    </Box>
  );
});
