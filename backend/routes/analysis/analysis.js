const express = require('express');
const router = express.Router();
const decimalCalc = require('../../utils/decimalCalculator');

// 导入工具模块
const { calculateFilteredSoldGoodsCost } = require('./utils/costCalculator');
const { calculateDetailAnalysis } = require('./utils/detailAnalyzer');
const { calculateSalesData } = require('./utils/salesCalculator');
const { getFilterOptions } = require('./utils/dataQueries');
const { validateAnalysisParams, validateBasicParams } = require('./utils/validator');
const {
  generateCacheKey,
  generateDetailCacheKey,
  readCache,
  writeCache
} = require('./utils/cacheManager');

// GET /api/analysis/data - 获取分析数据（从缓存读取）
router.get('/data', (req, res) => {
  const { start_date, end_date, customer_code, product_model } = req.query;
  
  // 参数校验
  const validation = validateBasicParams({ start_date, end_date });
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error
    });
  }
  
  // 生成缓存键
  const cacheKey = generateCacheKey(start_date, end_date, customer_code, product_model);
  
  // 读取缓存
  const cache = readCache();
  
  if (cache[cacheKey]) {
    return res.json({
      success: true,
      data: cache[cacheKey]
    });
  }
  
  // 缓存不存在
  return res.status(503).json({
    success: false,
    error: '分析数据未生成，请先点击刷新按钮计算数据。'
  });
});

// GET /api/analysis/detail - 获取详细分析数据（从缓存读取）
router.get('/detail', (req, res) => {
  const { start_date, end_date, customer_code, product_model } = req.query;
  
  // 参数校验
  const validation = validateBasicParams({ start_date, end_date });
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error
    });
  }
  
  // 生成详细分析缓存键
  const detailCacheKey = generateDetailCacheKey(start_date, end_date, customer_code, product_model);
  
  // 读取缓存
  const cache = readCache();
  
  if (cache[detailCacheKey]) {
    return res.json({
      success: true,
      data: cache[detailCacheKey]
    });
  }
  
  // 缓存不存在
  return res.json({
    success: true,
    data: []
  });
});

// POST /api/analysis/refresh - 刷新分析数据（重新计算并写入缓存）
router.post('/refresh', (req, res) => {
  const { start_date, end_date, customer_code, product_model } = req.body;
  
  // 参数校验
  const validation = validateAnalysisParams({ start_date, end_date, customer_code, product_model });
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error
    });
  }
  
  // 1. 计算销售额
  calculateSalesData(start_date, end_date, customer_code, product_model, (salesErr, salesData) => {
    if (salesErr) {
      console.error('计算销售额失败:', salesErr);
      return res.status(500).json({
        success: false,
        message: '计算销售额失败'
      });
    }
    
    // 2. 计算成本
    calculateFilteredSoldGoodsCost(start_date, end_date, customer_code, product_model, (costErr, costAmount) => {
      if (costErr) {
        console.error('计算成本失败:', costErr);
        return res.status(500).json({
          success: false,
          message: '计算成本失败'
        });
      }
      
      // 3. 使用 decimal.js 精确计算结果
      const salesAmount = salesData.sales_amount;
      const cost = decimalCalc.toDbNumber(costAmount, 2);
      const profit = decimalCalc.toDbNumber(decimalCalc.subtract(salesAmount, cost), 2);
      
      // 计算利润率
      let profitRate = 0;
      if (salesAmount > 0) {
        const rate = decimalCalc.multiply(decimalCalc.divide(profit, salesAmount), 100);
        profitRate = decimalCalc.toDbNumber(rate, 2);
      }
      
      // 4. 组装结果数据
      const resultData = {
        sales_amount: salesAmount,
        cost_amount: cost,
        profit_amount: profit,
        profit_rate: profitRate,
        query_params: {
          start_date,
          end_date,
          customer_code: customer_code || 'All',
          product_model: product_model || 'All'
        },
        last_updated: new Date().toISOString()
      };
      
      // 5. 计算详细分析数据
      calculateDetailAnalysis(start_date, end_date, customer_code, product_model, (detailErr, detailData) => {
        if (detailErr) {
          console.error('计算详细分析数据失败:', detailErr);
          // 即使详细分析失败，也返回基本数据
          detailData = [];
        }
        
        // 6. 写入缓存
        const cacheKey = generateCacheKey(start_date, end_date, customer_code, product_model);
        const detailCacheKey = generateDetailCacheKey(start_date, end_date, customer_code, product_model);
        const cache = readCache();
        
        cache[cacheKey] = resultData;
        cache[detailCacheKey] = {
          detail_data: detailData,
          last_updated: new Date().toISOString()
        };
        
        if (writeCache(cache)) {
          res.json({
            success: true,
            data: resultData
          });
        } else {
          res.status(500).json({
            success: false,
            message: '保存缓存失败'
          });
        }
      });
    });
  });
});

// GET /api/analysis/filter-options - 获取筛选选项
router.get('/filter-options', (req, res) => {
  getFilterOptions((err, options) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '查询筛选选项失败'
      });
    }
    
    res.json({
      success: true,
      ...options
    });
  });
});

// POST /api/analysis/clean-cache - 手动清理过期缓存
router.post('/clean-cache', (req, res) => {
  try {
    const cache = readCache();
    const originalSize = Object.keys(cache).length;
    
    if (writeCache(cache)) {
      const newCache = readCache();
      const newSize = Object.keys(newCache).length;
      const cleanedCount = originalSize - newSize;
      
      res.json({
        success: true,
        message: `清理完成，删除了 ${cleanedCount} 个过期缓存`,
        original_size: originalSize,
        new_size: newSize
      });
    } else {
      res.status(500).json({
        success: false,
        message: '清理缓存失败'
      });
    }
  } catch (error) {
    console.error('清理缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清理缓存失败'
    });
  }
});

module.exports = router;
