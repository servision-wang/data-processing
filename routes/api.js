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

// 获取配置 - 每个用户独立配置
router.get('/config/get', (req, res) => {
    try {
        // 获取当前登录用户ID
        const userId = req.session.user ? req.session.user.id : null
        if (!userId) {
            return res.json({ success: false, message: '未登录' })
        }

        let allConfigs = {}
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
            allConfigs = JSON.parse(configData)
        }

        // 返回该用户的配置，如果不存在则返回默认配置
        const userConfig = allConfigs[userId] || DEFAULT_CONFIG
        res.json({ success: true, config: userConfig })
    } catch (error) {
        console.error('读取配置失败:', error)
        res.json({ success: true, config: DEFAULT_CONFIG })
    }
})

// 保存配置 - 保存到当前用户的配置
router.post('/config/save', (req, res) => {
    try {
        // 获取当前登录用户ID
        const userId = req.session.user ? req.session.user.id : null
        if (!userId) {
            return res.json({ success: false, message: '未登录' })
        }

        const config = req.body

        if (!config || !Array.isArray(config.specialChars) || !Array.isArray(config.deductionRules)) {
            return res.json({ success: false, message: '配置格式不正确' })
        }

        // 读取所有配置
        let allConfigs = {}
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
            allConfigs = JSON.parse(configData)
        }

        // 更新当前用户的配置
        allConfigs[userId] = config

        // 保存回文件
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(allConfigs, null, 2), 'utf8')
        res.json({ success: true, message: '保存成功' })
    } catch (error) {
        console.error('保存配置失败:', error)
        res.json({ success: false, message: '保存失败: ' + error.message })
    }
})

// 删除用户配置 - 当用户被删除时调用
router.post('/config/delete/:userId', (req, res) => {
    try {
        const userId = req.params.userId

        // 读取所有配置
        let allConfigs = {}
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
            allConfigs = JSON.parse(configData)
        }

        // 删除该用户的配置
        if (allConfigs[userId]) {
            delete allConfigs[userId]
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(allConfigs, null, 2), 'utf8')
        }

        res.json({ success: true, message: '配置已删除' })
    } catch (error) {
        console.error('删除配置失败:', error)
        res.json({ success: false, message: '删除失败: ' + error.message })
    }
})

module.exports = router
