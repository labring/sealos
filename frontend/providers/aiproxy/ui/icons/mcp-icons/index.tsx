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
import blenderIcon from '@/ui/svg/icons/mcp/blender.svg'
import browserbaseIcon from '@/ui/svg/icons/mcp/browserbase.svg'
import excelIcon from '@/ui/svg/icons/mcp/excel.svg'
import magicIcon from '@/ui/svg/icons/mcp/21dev.png'
import alibabacloudDmsIcon from '@/ui/svg/icons/mcp/alibabacloud-dms.svg'
import academicSearchIcon from '@/ui/svg/icons/mcp/academic-search.svg'
import allvoicelabIcon from '@/ui/svg/icons/mcp/allvoicelab.png'
import cfworkerIcon from '@/ui/svg/icons/mcp/cfworker.svg'
import elasticsearchIcon from '@/ui/svg/icons/mcp/elasticsearch.svg'
import everythingSearchIcon from '@/ui/svg/icons/mcp/everything-search.svg'
import filesystemIcon from '@/ui/svg/icons/mcp/filesystem.svg'
import gitIcon from '@/ui/svg/icons/mcp/git.svg'
import knowledgeGraphMemoryIcon from '@/ui/svg/icons/mcp/knowledge-graph-memory.svg'
import mysqlIcon from '@/ui/svg/icons/mcp/mysql.svg'
import oceanbaseIcon from '@/ui/svg/icons/mcp/oceanbase.svg'
import openmemoryIcon from '@/ui/svg/icons/mcp/openmemory.svg'
import officeWordIcon from '@/ui/svg/icons/mcp/office-word.svg'
import redbookSearchCommentIcon from '@/ui/svg/icons/mcp/redbook-search-comment.svg'
import puppeteerIcon from '@/ui/svg/icons/mcp/puppeteer.svg'
import playwrightIcon from '@/ui/svg/icons/mcp/playwright.svg'
import markdownifyIcon from '@/ui/svg/icons/mcp/markdownify.svg'
import redisIcon from '@/ui/svg/icons/mcp/redis.svg'
import sqliteIcon from '@/ui/svg/icons/mcp/sqlite.svg'
import stockAnalysisIcon from '@/ui/svg/icons/mcp/stock-analysis.svg'
import queryTableIcon from '@/ui/svg/icons/mcp/query-table.svg'
import unionpayIcon from '@/ui/svg/icons/mcp/unionpay.svg'
import wecomBotIcon from '@/ui/svg/icons/mcp/wecom-bot.svg'
import chatIcon from '@/ui/svg/icons/mcp/chat.svg'
import webcontentIcon from '@/ui/svg/icons/mcp/webcontent.svg'
import githubIcon from '@/ui/svg/icons/mcp/github.svg'
import notionIcon from '@/ui/svg/icons/mcp/notion.svg'
import zhipuaiIcon from '@/ui/svg/icons/mcp/zhipuai.svg'
import weatherIcon from '@/ui/svg/icons/mcp/weather.svg'

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
  time: timeIcon,
  blender: blenderIcon,
  browserbase: browserbaseIcon,
  excel: excelIcon,
  magic: magicIcon,
  'alibabacloud-dms': alibabacloudDmsIcon,
  'academic-search': academicSearchIcon,
  allvoicelab: allvoicelabIcon,
  cfworker: cfworkerIcon,
  elasticsearch: elasticsearchIcon,
  'everything-search': everythingSearchIcon,
  filesystem: filesystemIcon,
  git: gitIcon,
  'knowledge-graph-memory': knowledgeGraphMemoryIcon,
  mysql: mysqlIcon,
  oceanbase: oceanbaseIcon,
  openmemory: openmemoryIcon,
  'office-word': officeWordIcon,
  'redbook-search-comment': redbookSearchCommentIcon,
  puppeteer: puppeteerIcon,
  playwright: playwrightIcon,
  markdownify: markdownifyIcon,
  redis: redisIcon,
  sqlite: sqliteIcon,
  'stock-analysis': stockAnalysisIcon,
  'query-table': queryTableIcon,
  unionpay: unionpayIcon,
  'wecom-bot': wecomBotIcon,
  chatsum: chatIcon,
  fetch: webcontentIcon,
  xhs: redbookSearchCommentIcon,
  github: githubIcon,
  notion: notionIcon,
  zhipuai: zhipuaiIcon,
  weather: weatherIcon,
}

export const getMcpIcon = (mcpId: string): StaticImageData => {
  const icon = mcpIcons[mcpId as keyof typeof mcpIcons] || mcpIcons['default']
  return icon
}
