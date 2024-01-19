import { Box, Flex, Image, Text } from '@chakra-ui/react';
import { useRef } from 'react';
import { Autoplay } from 'swiper/modules';
import { Swiper, SwiperRef, SwiperSlide, useSwiper } from 'swiper/react';
import 'swiper/css';
import { ArrowRightIcon } from '../icons/ArrowRight';

export const SlideData = [
  {
    image:
      'https://images.unsplash.com/photo-1546768292-fb12f6c92568?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    bg: '#824DFF',
    title: '1111',
    desc: 'Build the tools you can’t buy off the shelf',
    borderRadius: '8px',
    icon: 'https://jsd.onmicrosoft.cn/gh/appsmithorg/appsmith@release/static/logo.png'
  },
  {
    image:
      'https://images.unsplash.com/photo-1501446529957-6226bd447c46?ixlib=rb-1.2.1&ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=1489&q=80',
    bg: '#3770FE',
    title: '222',
    desc: 'Make AI more knowledgeable about you',
    borderRadius: '8px',
    icon: 'https://jsd.onmicrosoft.cn/gh/appsmithorg/appsmith@release/static/logo.png'
  },
  {
    image:
      'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?ixlib=rb-1.2.1&ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=1350&q=80',
    bg: '#824DFF',
    title: '333',
    desc: 'Build the tools you can’t buy off the shelf',
    borderRadius: '8px',
    icon: 'https://jsd.onmicrosoft.cn/gh/appsmithorg/appsmith@release/static/logo.png'
  },
  {
    image:
      'https://images.unsplash.com/photo-1475189778702-5ec9941484ae?ixlib=rb-1.2.1&ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=1351&q=80',
    bg: '#824DFF',
    title: '4444',
    desc: 'Build the tools you can’t buy off the shelf',
    borderRadius: '8px',
    icon: 'https://jsd.onmicrosoft.cn/gh/appsmithorg/appsmith@release/static/logo.png'
  }
];

export default function Banner() {
  const swiperRef = useRef<SwiperRef>(null);
  const swiper = useSwiper();

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

  return (
    <Box
      minW={'765px'}
      h="213px"
      mb="32px"
      position={'relative'}
      _hover={{
        '.my-prev-button, .my-next-button': {
          opacity: 1
        }
      }}>
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
        }}>
        {SlideData.map((item, index) => (
          <SwiperSlide key={index}>
            <Flex w="full" h="213px" gap={'16px'} overflow={'hidden'}>
              <Flex
                flex={1}
                bg={item.bg}
                borderRadius={item.borderRadius}
                p="16px 24px"
                justifyContent={'space-between'}>
                <Flex flexDirection={'column'} justifyContent={'space-between'}>
                  <Flex gap="12px" alignItems={'center'} mt="26px">
                    <Box
                      p={'6px'}
                      w={'48px'}
                      h={'48px'}
                      boxShadow={'0px 1px 2px 0.5px rgba(84, 96, 107, 0.20)'}
                      borderRadius={'4px'}
                      backgroundColor={'#fff'}
                      border={' 1px solid rgba(255, 255, 255, 0.50)'}>
                      <Image src={item.icon} alt="" width={'36px'} height={'36px'} />
                    </Box>
                    <Text fontSize={'20px'} color={'#FFF'} fontWeight={600}>
                      {item.title}
                    </Text>
                  </Flex>
                  <Text mb="26px" w="215px" fontSize={'16px'} color={'#FFF'} fontWeight={600}>
                    {item.desc}
                  </Text>
                </Flex>
                <Image maxW={'200px'} height={'100%'} src={item.image} alt={`slide-${index}`} />
              </Flex>
              <Flex
                flex={1}
                bg={SlideData[(index + 1) % SlideData.length].bg}
                borderRadius={SlideData[(index + 1) % SlideData.length].borderRadius}
                p="16px 24px"
                justifyContent={'space-between'}>
                <Flex flexDirection={'column'} justifyContent={'space-between'}>
                  <Flex gap="12px" alignItems={'center'} mt="26px">
                    <Box
                      p={'6px'}
                      w={'48px'}
                      h={'48px'}
                      boxShadow={'0px 1px 2px 0.5px rgba(84, 96, 107, 0.20)'}
                      borderRadius={'4px'}
                      backgroundColor={'#fff'}
                      border={' 1px solid rgba(255, 255, 255, 0.50)'}>
                      <Image
                        src={SlideData[(index + 1) % SlideData.length].icon}
                        alt=""
                        width={'36px'}
                        height={'36px'}
                      />
                    </Box>
                    <Text fontSize={'20px'} color={'#FFF'} fontWeight={600}>
                      {SlideData[(index + 1) % SlideData.length].title}
                    </Text>
                  </Flex>
                  <Text mb="26px" w="215px" fontSize={'16px'} color={'#FFF'} fontWeight={600}>
                    {SlideData[(index + 1) % SlideData.length].desc}
                  </Text>
                </Flex>
                <Image maxW={'200px'} height={'100%'} src={item.image} alt={`slide-${index}`} />
              </Flex>
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
        transform="translateY(-50%) rotate(180deg)">
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
        transform="translateY(-50%)">
        <ArrowRightIcon />
      </Box>
    </Box>
  );
}
