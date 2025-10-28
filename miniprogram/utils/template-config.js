// 订阅消息模板配置文件
// 使用说明：
// 1. 在微信公众平台申请订阅消息模板
// 2. 将获得的模板ID替换下面的示例ID
// 3. 取消注释相应的模板ID

const TEMPLATE_CONFIG = {
  // 喂食提醒模板
  feeding: 'wOJKfqqcbLI8MJvOScn9VTCTMFW-eWL9vtJIBeSHXQE',
  
  // 健康检查提醒模板  
  health: 'wOJKfqqcbLI8MJvOScn9VTCTMFW-eWL9vtJIBeSHXQE',
  
  // 清洁提醒模板
  cleaning: 'wOJKfqqcbLI8MJvOScn9VTCTMFW-eWL9vtJIBeSHXQE',
  
  // 用药提醒模板
  medication: 'wOJKfqqcbLI8MJvOScn9VTCTMFW-eWL9vtJIBeSHXQE',
  
  // 繁殖记录提醒模板
  breeding: 'wOJKfqqcbLI8MJvOScn9VTCTMFW-eWL9vtJIBeSHXQE'
}

// 获取已配置的模板ID
function getConfiguredTemplateIds() {
  return Object.entries(TEMPLATE_CONFIG)
    .filter(([key, value]) => value && value.trim() !== '')
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})
}

// 检查是否有可用的模板ID
function hasValidTemplateIds() {
  return Object.keys(getConfiguredTemplateIds()).length > 0
}

module.exports = {
  TEMPLATE_CONFIG,
  getConfiguredTemplateIds,
  hasValidTemplateIds
}