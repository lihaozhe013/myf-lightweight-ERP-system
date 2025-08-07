// 导出数据查询模块入口
const BasicDataQueries = require('./basicDataQueries');
const TransactionQueries = require('./transactionQueries');
const ReceivableQueries = require('./receivableQueries');
const PayableQueries = require('./payableQueries');
const InvoiceQueries = require('./invoiceQueries');
const AnalysisQueries = require('./analysisQueries');

class ExportQueries {
  constructor() {
    this.basicData = new BasicDataQueries();
    this.transaction = new TransactionQueries();
    this.receivable = new ReceivableQueries();
    this.payable = new PayableQueries();
    this.invoice = new InvoiceQueries();
    this.analysis = new AnalysisQueries();
  }

  /**
   * 获取基础信息数据
   */
  async getBaseInfoData(tables = '123') {
    return this.basicData.getBaseInfoData(tables);
  }

  /**
   * 获取入库出库数据
   */
  async getInboundOutboundData(filters = {}) {
    return this.transaction.getInboundOutboundData(filters);
  }

  /**
   * 获取应收应付数据
   */
  async getReceivablePayableData(filters = {}) {
    const { outboundFrom, outboundTo, paymentFrom, paymentTo } = filters;
    
    const result = {
      receivable_summary: await this.receivable.getReceivableSummary({ outboundFrom, outboundTo, paymentFrom, paymentTo }),
      receivable_details: await this.receivable.getReceivableDetails({ outboundFrom, outboundTo }),
      receivable_payments: await this.receivable.getReceivablePayments({ paymentFrom, paymentTo }),
      payable_summary: await this.payable.getPayableSummary({ outboundFrom, outboundTo, paymentFrom, paymentTo }),
      payable_details: await this.payable.getPayableDetails({ outboundFrom, outboundTo }),
      payable_payments: await this.payable.getPayablePayments({ paymentFrom, paymentTo })
    };
    
    return result;
  }

  /**
   * 获取发票数据
   */
  async getInvoiceData(filters = {}) {
    return this.invoice.getInvoiceData(filters);
  }

  /**
   * 获取按客户分类的分析数据
   */
  async getCustomerAnalysisData(startDate, endDate) {
    return this.analysis.getCustomerAnalysisData(startDate, endDate);
  }

  /**
   * 获取按产品分类的分析数据
   */
  async getProductAnalysisData(startDate, endDate) {
    return this.analysis.getProductAnalysisData(startDate, endDate);
  }

  // ========== 直接代理方法，保持向后兼容性 ==========

  /**
   * 获取客户供应商数据
   */
  getPartnersData() {
    return this.basicData.getPartnersData();
  }

  /**
   * 获取产品数据
   */
  getProductsData() {
    return this.basicData.getProductsData();
  }

  /**
   * 获取产品价格数据
   */
  getPricesData() {
    return this.basicData.getPricesData();
  }

  /**
   * 获取入库数据
   */
  getInboundData(filters = {}) {
    return this.transaction.getInboundData(filters);
  }

  /**
   * 获取出库数据
   */
  getOutboundData(filters = {}) {
    return this.transaction.getOutboundData(filters);
  }

  /**
   * 获取应收账款汇总
   */
  getReceivableSummary(filters = {}) {
    return this.receivable.getReceivableSummary(filters);
  }

  /**
   * 获取应收明细
   */
  getReceivableDetails(filters = {}) {
    return this.receivable.getReceivableDetails(filters);
  }

  /**
   * 获取回款记录
   */
  getReceivablePayments(filters = {}) {
    return this.receivable.getReceivablePayments(filters);
  }

  /**
   * 获取应付账款汇总
   */
  getPayableSummary(filters = {}) {
    return this.payable.getPayableSummary(filters);
  }

  /**
   * 获取应付明细
   */
  getPayableDetails(filters = {}) {
    return this.payable.getPayableDetails(filters);
  }

  /**
   * 获取付款记录
   */
  getPayablePayments(filters = {}) {
    return this.payable.getPayablePayments(filters);
  }
}

module.exports = ExportQueries;
