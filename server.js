const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/database');
const { swaggerUi, specs } = require('./swagger');
const apiRoutes = require('./routes/api');

const app = express();

// Performance & Security Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'leave-management-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/leave-management'
    }),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// MongoDB Atlas connection
connectDB();

// User Schema with indexes
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['employee', 'lead'], default: 'employee', index: true },
    employeeId: { type: String, required: true, unique: true, index: true },
    phone: String,
    dateOfJoining: { type: Date, index: true }
}, { timestamps: true });

// Leave Schema with indexes
const leaveSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeName: { type: String, required: true },
    employeeCode: { type: String, required: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    appliedAt: { type: Date, default: Date.now, index: true },
    reviewedBy: String,
    reviewedAt: Date
}, { timestamps: true });

// Compound indexes for common queries
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ status: 1, startDate: 1 });

// Chat Schema with indexes
const chatSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Leave = mongoose.model('Leave', leaveSchema);
const Chat = mongoose.model('Chat', chatSchema);

// API Routes (moved after model definitions)
app.use('/api', apiRoutes(User, Leave, Chat));

// Auth middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

const requireLead = (req, res, next) => {
    if (req.session.userRole !== 'lead') {
        return res.redirect('/employee-dashboard');
    }
    next();
};

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password').lean();
        
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id;
            req.session.userRole = user.role;
            req.session.userName = user.name;
            
            if (user.role === 'lead') {
                res.redirect('/lead-dashboard');
            } else {
                res.redirect('/employee-dashboard');
            }
        } else {
            res.render('login', { error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'Login failed. Please try again.' });
    }
});

app.get('/add-employee', requireAuth, requireLead, (req, res) => {
    res.render('add-employee', { userName: req.session.userName, error: null, success: null });
});

app.post('/add-employee', requireAuth, requireLead, async (req, res) => {
    try {
        const { name, email, employeeId, phone, dateOfJoining } = req.body;
        
        const existingUser = await User.findOne({ 
            $or: [{ email }, { employeeId }] 
        }).lean();
        
        if (existingUser) {
            return res.render('add-employee', { 
                userName: req.session.userName, 
                error: existingUser.email === email ? 'Email already exists' : 'Employee ID already exists', 
                success: null 
            });
        }
        
        const hashedPassword = await bcrypt.hash('password', 10);
        
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: 'employee',
            employeeId,
            phone,
            dateOfJoining: new Date(dateOfJoining)
        });
        
        await user.save();
        res.render('add-employee', { 
            userName: req.session.userName, 
            error: null, 
            success: 'Employee added successfully! Default password: password' 
        });
    } catch (error) {
        console.error('Add employee error:', error);
        res.render('add-employee', { 
            userName: req.session.userName, 
            error: 'Failed to add employee. Please try again.', 
            success: null 
        });
    }
});

// Employee Routes
app.get('/employee-dashboard', requireAuth, async (req, res) => {
    try {
        const leaves = await Leave.find({ employeeId: req.session.userId })
            .sort({ appliedAt: -1 })
            .limit(50)
            .lean();
        res.render('employee-dashboard', { 
            userName: req.session.userName,
            leaves 
        });
    } catch (error) {
        console.error('Employee dashboard error:', error);
        res.render('employee-dashboard', { 
            userName: req.session.userName,
            leaves: [],
            error: 'Failed to load dashboard data'
        });
    }
});

app.get('/apply-leave', requireAuth, (req, res) => {
    res.render('apply-leave', { userName: req.session.userName });
});

app.post('/apply-leave', requireAuth, async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.body;
        const user = await User.findById(req.session.userId).select('employeeId').lean();
        
        const leave = new Leave({
            employeeId: req.session.userId,
            employeeName: req.session.userName,
            employeeCode: user.employeeId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason
        });
        
        await leave.save();
        res.redirect('/employee-dashboard');
    } catch (error) {
        console.error('Apply leave error:', error);
        res.redirect('/employee-dashboard?error=Failed to apply leave');
    }
});

app.get('/change-password', requireAuth, (req, res) => {
    res.render('change-password', { userName: req.session.userName, error: null, success: null });
});

app.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (newPassword !== confirmPassword) {
        return res.render('change-password', { 
            userName: req.session.userName, 
            error: 'New passwords do not match', 
            success: null 
        });
    }
    
    const user = await User.findById(req.session.userId);
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
        return res.render('change-password', { 
            userName: req.session.userName, 
            error: 'Current password is incorrect', 
            success: null 
        });
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.session.userId, { password: hashedNewPassword });
    
    res.render('change-password', { 
        userName: req.session.userName, 
        error: null, 
        success: 'Password changed successfully!' 
    });
});

// Lead Routes
app.get('/lead-dashboard', requireAuth, requireLead, async (req, res) => {
    try {
        const leaves = await Leave.find()
            .populate('employeeId', 'name email employeeId')
            .sort({ appliedAt: -1 })
            .limit(100)
            .lean();
        res.render('lead-dashboard', { 
            userName: req.session.userName,
            leaves 
        });
    } catch (error) {
        console.error('Lead dashboard error:', error);
        res.render('lead-dashboard', { 
            userName: req.session.userName,
            leaves: [],
            error: 'Failed to load dashboard data'
        });
    }
});

app.get('/employees', requireAuth, requireLead, async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' })
            .select('name email employeeId phone dateOfJoining')
            .sort({ name: 1 })
            .lean();
        res.render('employees', { 
            userName: req.session.userName,
            employees 
        });
    } catch (error) {
        console.error('Employees list error:', error);
        res.render('employees', { 
            userName: req.session.userName,
            employees: [],
            error: 'Failed to load employees'
        });
    }
});

app.post('/reset-password/:id', requireAuth, requireLead, async (req, res) => {
    const hashedPassword = await bcrypt.hash('password', 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
    res.redirect('/employees');
});

app.post('/update-leave/:id', requireAuth, requireLead, async (req, res) => {
    const { status } = req.body;
    await Leave.findByIdAndUpdate(req.params.id, { 
        status,
        reviewedBy: req.session.userName,
        reviewedAt: new Date()
    });
    res.redirect('/lead-dashboard');
});

// Calendar Route
app.get('/calendar', requireAuth, async (req, res) => {
    try {
        const leaves = await Leave.find({ status: 'approved' })
            .populate('employeeId', 'name employeeId')
            .select('startDate endDate employeeName employeeCode')
            .sort({ startDate: 1 })
            .lean();
        res.render('calendar', { 
            userName: req.session.userName,
            userRole: req.session.userRole,
            leaves 
        });
    } catch (error) {
        console.error('Calendar error:', error);
        res.render('calendar', { 
            userName: req.session.userName,
            userRole: req.session.userRole,
            leaves: [],
            error: 'Failed to load calendar data'
        });
    }
});

// Chat Routes
app.get('/chat', requireAuth, async (req, res) => {
    try {
        const messages = await Chat.find()
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();
        res.render('chat', { 
            userName: req.session.userName,
            userRole: req.session.userRole,
            userId: req.session.userId,
            messages: messages.reverse()
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.render('chat', { 
            userName: req.session.userName,
            userRole: req.session.userRole,
            userId: req.session.userId,
            messages: [],
            error: 'Failed to load chat messages'
        });
    }
});

app.post('/chat', requireAuth, async (req, res) => {
    const { message } = req.body;
    
    const chat = new Chat({
        senderId: req.session.userId,
        senderName: req.session.userName,
        senderRole: req.session.userRole,
        message
    });
    
    await chat.save();
    res.redirect('/chat');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});