const fs = require('fs');
const path = require('path');

/**
 * 生成缓存键
 */
function generateCacheKey(startDate, endDate, customerCode, productModel) {
  const customer = customerCode || 'All';
  const product = productModel || 'All';
  return `${startDate}_${endDate}_${customer}_${product}`;
}

/**
 * 生成详细分析缓存键
 */
function generateDetailCacheKey(startDate, endDate, customerCode, productModel) {
  const customer = customerCode || 'All';
  const product = productModel || 'All';
  return `detail_${startDate}_${endDate}_${customer}_${product}`;
}

/**
 * 获取分析数据缓存文件路径
 */
function getCacheFilePath() {
  return path.resolve(__dirname, '../../../../data/analysis-cache.json');
}

/**
 * 清理过期缓存数据（30天以上）
 */
function cleanExpiredCache(cacheData) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const cleanedData = {};
  let cleanedCount = 0;
  
  Object.entries(cacheData).forEach(([key, data]) => {
    if (data.last_updated) {
      const lastUpdated = new Date(data.last_updated);
      // 保留30天内的缓存
      if (lastUpdated >= thirtyDaysAgo) {
        cleanedData[key] = data;
      } else {
        cleanedCount++;
      }
    } else {
      // 没有更新时间的数据也保留（兼容性）
      cleanedData[key] = data;
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`清理了 ${cleanedCount} 个过期的分析缓存`);
  }
  
  return cleanedData;
}

/**
 * 读取缓存数据
 */
function readCache() {
  const cacheFile = getCacheFilePath();
  if (fs.existsSync(cacheFile)) {
    try {
      const json = fs.readFileSync(cacheFile, 'utf-8');
      const cacheData = JSON.parse(json);
      // 读取时自动清理过期缓存
      return cleanExpiredCache(cacheData);
    } catch (e) {
      console.error('读取分析缓存失败:', e);
      return {};
    }
  }
  return {};
}

/**
 * 写入缓存数据
 */
function writeCache(cacheData) {
  const cacheFile = getCacheFilePath();
  try {
    // 写入前先清理过期缓存
    const cleanedData = cleanExpiredCache(cacheData);
    fs.writeFileSync(cacheFile, JSON.stringify(cleanedData, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('写入分析缓存失败:', e);
    return false;
  }
}

module.exports = {
  generateCacheKey,
  generateDetailCacheKey,
  getCacheFilePath,
  cleanExpiredCache,
  readCache,
  writeCache
};
