const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { isAuthenticated, isAdmin } = require('../middlewares/auth')
const { body, validationResult } = require('express-validator')

// 管理员页面
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.getAll()
        res.render('admin', {
            users,
            user: req.session.user,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        })
    } catch (error) {
        console.error('获取用户列表失败:', error)
        req.flash('error_msg', '获取用户列表失败')
        res.redirect('/tool')
    }
})

// 创建用户
router.post('/users', isAuthenticated, isAdmin, [
    body('username').notEmpty().withMessage('用户名不能为空')
        .isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50个字符之间'),
    body('password').notEmpty().withMessage('密码不能为空')
        .isLength({ min: 6 }).withMessage('密码长度至少6个字符'),
    body('expiryPeriod').optional({ checkFalsy: true })
], async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array()[0].msg)
        return res.redirect('/admin')
    }

    try {
        const { username, password, expiryPeriod } = req.body

        // 检查用户名是否已存在
        const existingUser = await User.findByUsername(username)
        if (existingUser) {
            req.flash('error_msg', '用户名已存在')
            return res.redirect('/admin')
        }

        // 根据下拉选择计算有效期
        let expiryDate = null
        if (expiryPeriod) {
            const months = parseInt(expiryPeriod)
            const now = new Date()
            expiryDate = new Date(now.setMonth(now.getMonth() + months))
        }

        await User.create(username, password, false, expiryDate)
        req.flash('success_msg', '用户创建成功')
        res.redirect('/admin')
    } catch (error) {
        console.error('创建用户失败:', error)
        req.flash('error_msg', '创建用户失败')
        res.redirect('/admin')
    }
})

// 更新用户
router.post('/users/:id', isAuthenticated, isAdmin, [
    body('password').optional({ checkFalsy: true })
        .isLength({ min: 6 }).withMessage('密码长度至少6个字符'),
    body('expiryPeriod').optional({ checkFalsy: true })
], async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array()[0].msg)
        return res.redirect('/admin')
    }

    try {
        const { id } = req.params
        const { password, expiryPeriod } = req.body

        const updateData = {}
        if (password) updateData.password = password

        // 根据下拉选择计算有效期
        if (expiryPeriod !== undefined) {
            if (expiryPeriod === '') {
                updateData.expiryDate = null
            } else {
                const months = parseInt(expiryPeriod)
                const now = new Date()
                updateData.expiryDate = new Date(now.setMonth(now.getMonth() + months))
            }
        }

        await User.update(id, updateData)
        req.flash('success_msg', '用户更新成功')
        res.redirect('/admin')
    } catch (error) {
        console.error('更新用户失败:', error)
        req.flash('error_msg', '更新用户失败')
        res.redirect('/admin')
    }
})

// 删除用户
router.post('/users/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { id } = req.params
        await User.delete(id)
        req.flash('success_msg', '用户删除成功')
        res.redirect('/admin')
    } catch (error) {
        console.error('删除用户失败:', error)
        req.flash('error_msg', '删除用户失败')
        res.redirect('/admin')
    }
})

module.exports = router
