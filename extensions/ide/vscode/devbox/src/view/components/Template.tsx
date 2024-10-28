import { useState } from 'react'
import { Box, Grid, Text, Button } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

import MyIcon from './MyIcon'
import { templates } from '../constants/template'

export interface TemplateItem {
  name: string
  title: string
}

const Template = () => {
  const navigate = useNavigate()
  const handleUseTemplate = ({ name, title }: TemplateItem) => {
    navigate('/info', { state: { name, title } })
  }

  return (
    <Box padding={5}>
      <Box fontSize={'2xl'} mb={4}>
        Template
      </Box>
      {templates.map((category) => (
        <Box key={category.category} mb={6}>
          <Box fontSize={'xl'} mb={2}>
            {category.category}
          </Box>
          <Grid gap={4} gridTemplateColumns={'repeat(3, 1fr)'}>
            {category.items.map((item) => (
              <TemplateCard
                key={item.name}
                item={item}
                onUse={handleUseTemplate}
              />
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  )
}

const TemplateCard = ({
  item,
  onUse,
}: {
  item: TemplateItem
  onUse: ({ name, title }: TemplateItem) => void
}) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Box
      borderWidth={1}
      borderRadius={'4px'}
      padding={4}
      boxShadow="md"
      minW={'400px'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      cursor="pointer"
      bg={'#F3F3F3'}
      _hover={{ bg: '#E3E3E3' }}
      display={'flex'}
      alignItems={'center'}
      justifyContent={'space-between'}
      onClick={() => onUse({ name: item.name, title: item.title })}>
      <Box w={'60px'} display={'flex'} alignItems={'center'}>
        <MyIcon name={item.name} />
      </Box>
      <Box>
        <Text fontSize={'l'} fontWeight={'500'}>
          {item.title}
        </Text>
        <Text fontSize="sm" color={'#616161'}>
          Quick Start a {item.title} Project
        </Text>
      </Box>
      <Button
        ml={10}
        width={'60px'}
        colorScheme="blue"
        visibility={isHovered ? 'visible' : 'hidden'}
        onClick={() => onUse({ name: item.name, title: item.title })}>
        Use
      </Button>
    </Box>
  )
}

export default Template
