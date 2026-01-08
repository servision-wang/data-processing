const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { body, validationResult } = require('express-validator')

// 登录页面
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/tool')
    }
    res.render('login', {
        error_msg: req.flash('error_msg')
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

        req.session.user = {
            id: user.id,
            username: user.username,
            is_admin: user.is_admin
        }

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
router.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/login')
})

module.exports = router
