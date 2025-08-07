/**
 * 验证分析参数
 * @param {Object} params 参数对象
 * @param {string} params.start_date 开始日期
 * @param {string} params.end_date 结束日期
 * @param {string} params.customer_code 客户代号（可选）
 * @param {string} params.product_model 产品型号（可选）
 * @returns {Object} 验证结果 {isValid: boolean, error?: string}
 */
function validateAnalysisParams(params) {
  const { start_date, end_date, customer_code, product_model } = params;
  
  // 检查必填参数
  if (!start_date || !end_date) {
    return {
      isValid: false,
      error: '开始日期和结束日期不能为空'
    };
  }
  
  // 日期格式校验
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
    return {
      isValid: false,
      error: '日期格式错误，请使用 YYYY-MM-DD 格式'
    };
  }
  
  // 检查日期区间合理性
  if (new Date(start_date) > new Date(end_date)) {
    return {
      isValid: false,
      error: '开始日期不能晚于结束日期'
    };
  }
  
  return {
    isValid: true
  };
}

/**
 * 验证基础分析参数（只需要时间区间）
 * @param {Object} params 参数对象
 * @param {string} params.start_date 开始日期
 * @param {string} params.end_date 结束日期
 * @returns {Object} 验证结果 {isValid: boolean, error?: string}
 */
function validateBasicParams(params) {
  const { start_date, end_date } = params;
  
  // 检查必填参数
  if (!start_date || !end_date) {
    return {
      isValid: false,
      error: '开始日期和结束日期不能为空'
    };
  }
  
  return {
    isValid: true
  };
}

module.exports = {
  validateAnalysisParams,
  validateBasicParams
};
