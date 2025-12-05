const express = require('express')
const router = express.Router()
const { isAuthenticated, checkExpiry } = require('../middlewares/auth')

// 工具页面（需要登录）
router.get('/', isAuthenticated, checkExpiry, (req, res) => {
    res.render('tool', {
        user: req.session.user
    })
})

module.exports = router
