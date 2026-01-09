require('dotenv').config()
const express = require('express')
const session = require('express-session')
const flash = require('connect-flash')
const path = require('path')
const db = require('./config/database')
const authRoutes = require('./routes/auth')
const toolRoutes = require('./routes/tool')
const adminRoutes = require('./routes/admin')
const { updateSessionActivity } = require('./middlewares/auth')
const User = require('./models/User')

const app = express()
const PORT = process.env.PORT || 3000

// 信任代理服务器，以便正确获取客户端真实IP
app.set('trust proxy', true)

// 视图引擎设置
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// 中间件
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Session 配置
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
}))

app.use(flash())

// 全局变量中间件
app.use((req, res, next) => {
    res.locals.user = req.session.user || null
    res.locals.success_msg = req.flash('success_msg')
    res.locals.error_msg = req.flash('error_msg')
    res.locals.error = req.flash('error')
    next()
})

// 更新会话活跃时间中间件（在所有需要认证的路由之前）
app.use(updateSessionActivity)

// 根路由重定向
app.get('/', (req, res) => {
    res.redirect('/login')
})

// 添加 API 路由（在静态文件之前，在其他路由之前）
const apiRouter = require('./routes/api')
app.use('/api', apiRouter)

// 路由
app.use('/', authRoutes)
app.use('/tool', toolRoutes)
app.use('/admin', adminRoutes)

// 初始化数据库和创建管理员账号
async function initializeApp() {
    try {
        await db.initialize()
        console.log('数据库初始化成功')

        // 定期清理过期会话（每小时执行一次）
        setInterval(async () => {
            try {
                await User.cleanExpiredSessions()
                console.log('已清理过期的登录会话')
            } catch (error) {
                console.error('清理过期会话失败:', error)
            }
        }, 60 * 60 * 1000) // 1小时

        app.listen(PORT, () => {
            console.log(`服务器运行在 http://localhost:${PORT}`)
        })
    } catch (error) {
        console.error('应用启动失败:', error)
        process.exit(1)
    }
}

initializeApp()
