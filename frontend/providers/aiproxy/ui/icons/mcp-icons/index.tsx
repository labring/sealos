import { StaticImageData } from 'next/image'
import DefaultIcon from '@/ui/svg/icons/mcp/default.svg'
import alipayIcon from '@/ui/svg/icons/mcp/alipay.svg'
import baiduMapIcon from '@/ui/svg/icons/mcp/baiduMap.svg'
import one2306Icon from '@/ui/svg/icons/mcp/12306.svg'
import bingIcon from '@/ui/svg/icons/mcp/bing.svg'
import amapIcon from '@/ui/svg/icons/mcp/amap.svg'
import searchIcon from '@/ui/svg/icons/mcp/search.svg'
import firecrawlIcon from '@/ui/svg/icons/mcp/firecrawl.svg'
import flomoIcon from '@/ui/svg/icons/mcp/flomo.svg'
import vis from '@/ui/svg/icons/mcp/vis.svg'
import hefengIcon from '@/ui/svg/icons/mcp/hefeng.svg'
import gezheIcon from '@/ui/svg/icons/mcp/gezhe.svg'
import tavilyIcon from '@/ui/svg/icons/mcp/tavily.svg'
import jinaIcon from '@/ui/svg/icons/mcp/jina.svg'
import howtocookIcon from '@/ui/svg/icons/mcp/howtocook.svg'
import timeIcon from '@/ui/svg/icons/mcp/time.svg'

export const mcpIcons = {
  default: DefaultIcon,
  alipay: alipayIcon,
  '12306': one2306Icon,
  'baidu-map': baiduMapIcon,
  'bing-cn-search': bingIcon,
  amap: amapIcon,
  'web-search': searchIcon,
  firecrawl: firecrawlIcon,
  flomo: flomoIcon,
  'gpt-vis': vis,
  'hefeng-weather': hefengIcon,
  gezhe: gezheIcon,
  tavily: tavilyIcon,
  jina: jinaIcon,
  howtocook: howtocookIcon,
  time: timeIcon
}

export const getMcpIcon = (mcpId: string): StaticImageData => {
  const icon = mcpIcons[mcpId as keyof typeof mcpIcons] || mcpIcons['default']
  return icon
}
