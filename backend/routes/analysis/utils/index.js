// 分析功能工具模块索引
// 集中导出所有分析相关的工具函数

const { calculateFilteredSoldGoodsCost } = require('./costCalculator');
const { calculateDetailAnalysis } = require('./detailAnalyzer');
const { calculateSalesData } = require('./salesCalculator');
const { getFilterOptions } = require('./dataQueries');
const { validateAnalysisParams, validateBasicParams } = require('./validator');
const {
  generateCacheKey,
  generateDetailCacheKey,
  getCacheFilePath,
  cleanExpiredCache,
  readCache,
  writeCache
} = require('./cacheManager');

module.exports = {
  // 成本计算
  calculateFilteredSoldGoodsCost,
  
  // 销售数据计算
  calculateSalesData,
  
  // 详细分析
  calculateDetailAnalysis,
  
  // 数据查询
  getFilterOptions,
  
  // 参数验证
  validateAnalysisParams,
  validateBasicParams,
  
  // 缓存管理
  generateCacheKey,
  generateDetailCacheKey,
  getCacheFilePath,
  cleanExpiredCache,
  readCache,
  writeCache
};
