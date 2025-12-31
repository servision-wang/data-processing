const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '../data/config.json')

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
}

// 默认配置
const DEFAULT_CONFIG = {
    specialChars: ['挖', '爬'],
    deductionRules: [
        { min: 81, max: 199, deduction: 5 },
        { min: 200, max: 399, deduction: 10 },
        { min: 400, max: 599, deduction: 20 },
        { min: 600, max: 799, deduction: 30 },
        { min: 800, max: 1049, deduction: 40 },
        { min: 1050, max: 1999, deduction: 50, increment: 10, interval: 200 },
        { min: 2000, max: 2080, deduction: 80 },
        { min: 2081, max: 2400, deduction: 100 },
        { min: 2401, max: Infinity, deduction: 120 }
    ]
}

// 获取配置
router.get('/config/get', (req, res) => {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
            const config = JSON.parse(configData)
            res.json({ success: true, config })
        } else {
            res.json({ success: true, config: DEFAULT_CONFIG })
        }
    } catch (error) {
        console.error('读取配置失败:', error)
        res.json({ success: true, config: DEFAULT_CONFIG })
    }
})

// 保存配置
router.post('/config/save', (req, res) => {
    try {
        const config = req.body

        if (!config || !Array.isArray(config.specialChars) || !Array.isArray(config.deductionRules)) {
            return res.json({ success: false, message: '配置格式不正确' })
        }

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
        res.json({ success: true, message: '保存成功' })
    } catch (error) {
        console.error('保存配置失败:', error)
        res.json({ success: false, message: '保存失败: ' + error.message })
    }
})

module.exports = router
