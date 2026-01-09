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
    if (req.session && req.session.user && !req.session.user.is_admin) {
        const user = await User.findById(req.session.user.id)
        if (User.isExpired(user)) {
            return req.session.destroy((err) => {
                if (err) {
                    console.error('销毁会话失败:', err)
                }
                return res.redirect('/login?msg=account_expired')
            })
        }
    }
    next()
}

// 更新会话活跃时间并验证会话是否有效
async function updateSessionActivity(req, res, next) {
    if (req.session && req.session.user && req.sessionID) {
        try {
            // 获取客户端真实IP
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

            // 检查该会话是否仍然存在于数据库中（是否被踢出）
            const db = require('../config/database')
            const pool = db.getPool()
            const [sessions] = await pool.query(
                'SELECT id FROM login_sessions WHERE session_id = ? AND user_id = ?',
                [req.sessionID, req.session.user.id]
            )

            // 如果会话不存在，说明已被踢出
            if (sessions.length === 0) {
                console.log(`会话已失效：用户 ${req.session.user.username} (ID: ${req.session.user.id}), IP: ${clientIP}, SessionID: ${req.sessionID}`)

                // 保存用户信息用于显示消息
                const username = req.session.user.username

                // 销毁会话（使用回调确保完成）
                return req.session.destroy((err) => {
                    if (err) {
                        console.error('销毁会话失败:', err)
                    }

                    // 如果是API请求，返回JSON
                    if (req.path.startsWith('/api/')) {
                        return res.status(401).json({ error: '会话已失效，请重新登录' })
                    }

                    // 如果是页面请求，重定向到登录页
                    return res.redirect('/login?msg=session_expired')
                })
            }

            // 会话有效，更新活跃时间
            await User.updateSessionActivity(req.sessionID)
        } catch (err) {
            console.error('验证会话失败:', err)
        }
    }
    next()
}

module.exports = {
    isAuthenticated,
    isAdmin,
    checkExpiry,
    updateSessionActivity
}
