const express = require('express');
const router = express.Router();
const ExcelExporter = require('./utils/excelExporter');

// 导出基础信息
router.post('/base-info', async (req, res) => {
    try {
        const { tables } = req.body;
        
        const exporter = new ExcelExporter();
        const buffer = await exporter.exportBaseInfo({
            tables: tables || '123'
        });
        
        const filename = exporter.generateFilename('base-info');
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);
    } catch (error) {
        console.error('基础信息导出失败:', error);
        res.status(500).json({
            success: false,
            message: `导出失败: ${error.message}`
        });
    }
});

// 导出入库出库记录
router.post('/inbound-outbound', async (req, res) => {
    try {
        const { tables, dateFrom, dateTo, productCode, customerCode } = req.body;
        
        const exporter = new ExcelExporter();
        const buffer = await exporter.exportInboundOutbound({
            tables: tables || '12',
            dateFrom,
            dateTo,
            productCode,
            customerCode
        });
        
        const filename = exporter.generateFilename('inbound-outbound');
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);
    } catch (error) {
        console.error('入库出库记录导出失败:', error);
        res.status(500).json({
            success: false,
            message: `导出失败: ${error.message}`
        });
    }
});

// 对账单导出 
// 注意：对账单实际上和导出入库出库记录是一模一样的表，只是排版不同。
// 入库出库记录是完整的记录，对账单是定制格式的记录

// 导出对账单
router.post('/statement', async (req, res) => {
    try {
        const { tables, dateFrom, dateTo, productCode, customerCode } = req.body;
        
        const exporter = new ExcelExporter();
        const buffer = await exporter.exportStatement({
            tables: tables || '12',
            dateFrom,
            dateTo,
            productCode,
            customerCode
        });
        
        const filename = exporter.generateFilename('statement');
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);
    } catch (error) {
        console.error('对账单导出失败:', error);
        res.status(500).json({
            success: false,
            message: `导出失败: ${error.message}`
        });
    }
});

// 导出应收应付明细
router.post('/receivable-payable', async (req, res) => {
    try {
        const { outboundFrom, outboundTo, paymentFrom, paymentTo } = req.body;
        
        const exporter = new ExcelExporter();
        const buffer = await exporter.exportReceivablePayable({
            outboundFrom,
            outboundTo,
            paymentFrom,
            paymentTo
        });
        
        const filename = exporter.generateFilename('receivable-payable');
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);
    } catch (error) {
        console.error('应收应付明细导出失败:', error);
        res.status(500).json({
            success: false,
            message: `导出失败: ${error.message}`
        });
    }
});

// 导出发票明细
router.post('/invoice', async (req, res) => {
    try {
        const { partnerCode, dateFrom, dateTo } = req.body;
        
        if (!partnerCode) {
            return res.status(400).json({
                success: false,
                message: '合作伙伴代号是必填项'
            });
        }
        
        const exporter = new ExcelExporter();
        const buffer = await exporter.exportInvoice({
            partnerCode,
            dateFrom,
            dateTo
        });
        
        const filename = exporter.generateFilename('invoice');
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);
    } catch (error) {
        console.error('发票导出失败:', error);
        res.status(500).json({
            success: false,
            message: `导出失败: ${error.message}`
        });
    }
});

// 导出分析数据
router.post('/analysis', async (req, res) => {
    try {
        const { analysisData, detailData, startDate, endDate, customerCode, productModel } = req.body;
        
        if (!analysisData) {
            return res.status(400).json({
                success: false,
                message: '分析数据是必填项'
            });
        }
        
        const exporter = new ExcelExporter();
        const buffer = await exporter.exportAnalysis({
            analysisData,
            detailData: detailData || [],
            startDate,
            endDate,
            customerCode,
            productModel
        });
        
        const filename = exporter.generateFilename('analysis');
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);
    } catch (error) {
        console.error('分析数据导出失败:', error);
        res.status(500).json({
            success: false,
            message: `导出失败: ${error.message}`
        });
    }
});

// 获取导出状态
router.get('/status', (req, res) => {
    res.json({
        success: true,
        message: '导出服务运行正常 (Node.js原生实现)',
        version: '2.0 - Excel直接下载',
        available_exports: [
            {
                name: 'base-info',
                description: '基础信息导出（客户/供应商、产品、产品价格）',
                endpoint: '/api/export/base-info',
                method: 'POST',
                response_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            {
                name: 'inbound-outbound',
                description: '入库出库记录导出',
                endpoint: '/api/export/inbound-outbound',
                method: 'POST',
                response_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            {
                name: 'statement',
                description: '对账单导出（定制格式的入库出库记录）',
                endpoint: '/api/export/statement',
                method: 'POST',
                response_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            {
                name: 'receivable-payable',
                description: '应收应付明细导出',
                endpoint: '/api/export/receivable-payable',
                method: 'POST',
                response_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            {
                name: 'invoice',
                description: '发票导出（按产品合并数量和金额）',
                endpoint: '/api/export/invoice',
                method: 'POST',
                required_params: ['partnerCode', 'dateFrom', 'dateTo'],
                response_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            {
                name: 'analysis',
                description: '数据分析导出（分析汇总和详细数据）',
                endpoint: '/api/export/analysis',
                method: 'POST',
                required_params: ['analysisData'],
                response_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        ],
        features: [
            '✅ 纯Node.js实现，无Python依赖',
            '✅ 内存导出，无临时文件',
            '✅ 直接下载，即时响应',
            '✅ Excel格式完全兼容',
            '✅ 支持并发导出请求'
        ]
    });
});

// 高级分析数据导出
router.post('/analysis/advanced', async (req, res) => {
    try {
        const { exportType, startDate, endDate } = req.body;
        
        // 验证必需参数
        if (!exportType || !['customer', 'product'].includes(exportType)) {
            return res.status(400).json({
                success: false,
                message: '导出类型必须是 customer 或 product'
            });
        }
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: '开始日期和结束日期不能为空'
            });
        }
        
        const exporter = new ExcelExporter();
        const buffer = await exporter.exportAdvancedAnalysis({
            exportType,
            startDate,
            endDate
        });
        
        // 生成文件名
        const typeText = exportType === 'customer' ? '客户分类' : '产品分类';
        const dateText = `${startDate.replace(/-/g, '')}-${endDate.replace(/-/g, '')}`;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:-]/g, '');
        const filename = `高级分析导出-${typeText}-${dateText}-${timestamp}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);
    } catch (error) {
        console.error('高级分析数据导出失败:', error);
        res.status(500).json({
            success: false,
            message: `导出失败: ${error.message}`
        });
    }
});

module.exports = router;
