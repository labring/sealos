export enum QueryKey {
  // 共用
  // common
  GetTokens = 'getTokens',
  GetUserLogs = 'getUserLogs',
  GetEnabledModels = 'getEnabledModels',
  GetDashboardData = 'getDashboardData',
  GetUserLogDetail = 'getUserLogDetail',

  // admin
  GetChannels = 'getChannels',
  GetAllChannels = 'getAllChannels',
  GetGlobalLogs = 'getGlobalLogs',
  GetGroups = 'getGroups',
  GetChannelTypeNames = 'getChannelTypeNames',
  GetAllChannelModes = 'getAllChannelModes',
  GetDefaultModelAndModeMapping = 'getDefaultModelAndModeMapping',
  GetOption = 'getOption',

  // 组件自己管理
  GetCommonConfig = 'getCommonConfig'
}
