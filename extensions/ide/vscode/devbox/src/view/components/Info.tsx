import { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Text,
  InputGroup,
  InputLeftAddon,
} from '@chakra-ui/react'
import { useNavigate, useLocation } from 'react-router-dom'

import MyIcon from './MyIcon'

interface NetworkItem {
  port: number
  remoteAccess: boolean
  protocol: string
  publicDomain: string
  customDomain: string
}

const Info = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const template = location.state || { name: 'go', title: 'Go' }
  const [projectName, setProjectName] = useState('')
  const [networks, setNetworks] = useState<NetworkItem[]>([
    {
      port: 80,
      remoteAccess: true,
      protocol: 'https',
      publicDomain: 'hello.cloud.xxx.io',
      customDomain: '',
    },
  ])
  const [githubRepo, setGithubRepo] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  const handleSubmit = () => {
    console.log({ projectName, networks, githubRepo, projectDescription })
  }

  return (
    <Box p={5}>
      {/* navbar */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box
          display="flex"
          alignItems="center"
          onClick={() => navigate('/')}
          cursor={'pointer'}>
          <MyIcon name="arrowLeft" />
          <Text>Choose Template</Text>
        </Box>
        <Button colorScheme="blue" onClick={handleSubmit}>
          Create
        </Button>
      </Box>
      {/* form body */}
      <Box mt={5}>
        {/* template */}
        <FormControl isRequired mb={4}>
          <FormLabel>Template</FormLabel>
          <Box
            p={4}
            display="flex"
            flexDirection={'column'}
            alignItems="center"
            width={'full'}
            bg={'#F3F3F3'}>
            <Box w={'60px'} display={'flex'} alignItems={'center'}>
              <MyIcon name={template.name} />
              <Text ml={2} fontSize={'l'} fontWeight={'500'}>
                {template.title}
              </Text>
            </Box>
            <Text fontSize="sm" color={'#616161'} mt={2}>
              Quick Start a {template.title} Project
            </Text>
          </Box>
        </FormControl>
        {/* project name */}
        <FormControl isRequired mb={4}>
          <FormLabel>Project Name</FormLabel>
          <Input
            border={'none'}
            bg={'#F3F3F3'}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Please input project name"
          />
        </FormControl>

        <FormControl mt={4}>
          <FormLabel>Github Repo</FormLabel>
          <InputGroup bg={'#F3F3F3'}>
            <InputLeftAddon bg={'#F3F3F3'} border={'none'}>
              <MyIcon name="attach" />
            </InputLeftAddon>
            <Input
              border={'none'}
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="Github Repository"
            />
          </InputGroup>
        </FormControl>

        <FormControl mt={4}>
          <FormLabel>Project Description</FormLabel>
          <Textarea
            bg={'#F3F3F3'}
            border={'none'}
            height={'200px'}
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="What does this project do?"
          />
        </FormControl>
      </Box>
    </Box>
  )
}

export default Info
