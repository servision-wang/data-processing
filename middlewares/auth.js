const User = require('../models/User')

// 检查用户是否已登录
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next()
    }
    req.flash('error_msg', '请先登录')
    res.redirect('/login')
}

// 检查用户是否是管理员
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.is_admin) {
        return next()
    }
    req.flash('error_msg', '您没有权限访问此页面')
    res.redirect('/tool')
}

// 检查用户账号是否过期
async function checkExpiry(req, res, next) {
    if (req.session.user && !req.session.user.is_admin) {
        const user = await User.findById(req.session.user.id)
        if (User.isExpired(user)) {
            req.session.destroy()
            req.flash('error_msg', '您的账号已过期，请联系管理员')
            return res.redirect('/login')
        }
    }
    next()
}

module.exports = {
    isAuthenticated,
    isAdmin,
    checkExpiry
}
