import { Icon } from '@chakra-ui/react'
import type { IconProps } from '@chakra-ui/react'

const map = {
  c: require('../public/c.svg').default,
  flask: require('../public/flask.svg').default,
  gin: require('../public/gin.svg').default,
  go: require('../public/go.svg').default,
  rust: require('../public/rust.svg').default,
  hertz: require('../public/hertz.svg').default,
  nodejs: require('../public/nodejs.svg').default,
  nextjs: require('../public/nextjs.svg').default,
  java: require('../public/java.svg').default,
  python: require('../public/python.svg').default,
  springBoot: require('../public/spring-boot.svg').default,
  vue: require('../public/vue.svg').default,
  ubuntu: require('../public/ubuntu.svg').default,
  delete: require('../public/info/delete.svg').default,
  add: require('../public/info/add.svg').default,
  attach: require('../public/info/attach.svg').default,
  arrowLeft: require('../public/info/arrow-left.svg').default,
  debian: require('../public/debian.svg').default,
}

const MyIcon = ({
  name,
  w = 'auto',
  h = 'auto',
  ...props
}: { name: string } & IconProps) => {
  const IconComponent = map[name as keyof typeof map]

  return IconComponent ? (
    <Icon
      as={IconComponent}
      verticalAlign={'text-top'}
      fill={'currentColor'}
      w={w}
      h={h}
      {...props}
    />
  ) : (
    <Icon
      verticalAlign={'text-top'}
      fill={'currentColor'}
      w={w}
      h={h}
      {...props}
    />
  )
}

export default MyIcon
