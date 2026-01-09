const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { body, validationResult } = require('express-validator')

// 登录页面
router.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/tool')
    }

    // 处理不同的错误消息
    const errorMessages = req.flash('error_msg')
    if (req.query.msg === 'session_expired') {
        errorMessages.push('您的账号在其他设备登录，当前会话已失效')
    } else if (req.query.msg === 'account_expired') {
        errorMessages.push('您的账号已过期，请联系管理员')
    }

    res.render('login', {
        error_msg: errorMessages
    })
})

// 登录处理
router.post('/login', [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
], async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('login', {
            error_msg: [errors.array()[0].msg]
        })
    }

    try {
        const { username, password } = req.body
        const user = await User.findByUsername(username)

        if (!user) {
            return res.render('login', {
                error_msg: ['用户名或密码错误']
            })
        }

        const isMatch = await User.comparePassword(password, user.password)
        if (!isMatch) {
            return res.render('login', {
                error_msg: ['用户名或密码错误']
            })
        }

        // 检查账号是否过期
        if (!user.is_admin && User.isExpired(user)) {
            return res.render('login', {
                error_msg: ['您的账号已过期，请联系管理员']
            })
        }

        // 获取客户端真实IP地址
        let clientIP = req.ip || req.connection.remoteAddress

        // 处理 x-forwarded-for 头（Nginx 代理）
        const forwardedFor = req.headers['x-forwarded-for']
        if (forwardedFor) {
            clientIP = forwardedFor.split(',')[0].trim()
        }

        // 处理 x-real-ip 头（Nginx 代理）
        if (req.headers['x-real-ip']) {
            clientIP = req.headers['x-real-ip']
        }

        // 去除 IPv6 前缀
        if (clientIP && clientIP.startsWith('::ffff:')) {
            clientIP = clientIP.substring(7)
        }

        console.log(`用户 ${username} 尝试从 IP ${clientIP} 登录`)

        // 检查IP登录数量限制（管理员不受限制）
        // 如果超限会自动踢掉最早的会话
        if (!user.is_admin) {
            await User.checkIPLimit(user.id, clientIP)
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            is_admin: user.is_admin
        }

        // 记录登录会话
        await User.recordLoginSession(user.id, clientIP, req.sessionID)

        // 如果是管理员，跳转到管理页面
        if (user.is_admin) {
            res.redirect('/admin')
        } else {
            res.redirect('/tool')
        }
    } catch (error) {
        console.error('登录错误:', error)
        return res.render('login', {
            error_msg: ['登录失败，请稍后重试']
        })
    }
})

// 登出
router.get('/logout', async (req, res) => {
    // 删除登录会话记录
    if (req.sessionID) {
        await User.removeLoginSession(req.sessionID)
    }
    req.session.destroy()
    res.redirect('/login')
})

module.exports = router
