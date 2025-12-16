const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/database');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'leave-management-secret',
    resave: false,
    saveUninitialized: false
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// MongoDB Atlas connection
connectDB();

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: { type: String, enum: ['employee', 'lead'], default: 'employee' },
    employeeId: String,
    phone: String,
    dateOfJoining: Date
});

// Leave Schema
const leaveSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    employeeName: String,
    employeeCode: String,
    startDate: Date,
    endDate: Date,
    reason: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    appliedAt: { type: Date, default: Date.now },
    reviewedBy: String,
    reviewedAt: Date
});

// Chat Schema
const chatSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: String,
    senderRole: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Leave = mongoose.model('Leave', leaveSchema);
const Chat = mongoose.model('Chat', chatSchema);

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
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
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
});

app.get('/add-employee', requireAuth, requireLead, (req, res) => {
    res.render('add-employee', { userName: req.session.userName, error: null, success: null });
});

app.post('/add-employee', requireAuth, requireLead, async (req, res) => {
    const { name, email, employeeId, phone, dateOfJoining } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.render('add-employee', { 
            userName: req.session.userName, 
            error: 'Email already exists', 
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
});

// Employee Routes
app.get('/employee-dashboard', requireAuth, async (req, res) => {
    const leaves = await Leave.find({ employeeId: req.session.userId });
    res.render('employee-dashboard', { 
        userName: req.session.userName,
        leaves 
    });
});

app.get('/apply-leave', requireAuth, (req, res) => {
    res.render('apply-leave', { userName: req.session.userName });
});

app.post('/apply-leave', requireAuth, async (req, res) => {
    const { startDate, endDate, reason } = req.body;
    const user = await User.findById(req.session.userId);
    
    const leave = new Leave({
        employeeId: req.session.userId,
        employeeName: req.session.userName,
        employeeCode: user.employeeId,
        startDate,
        endDate,
        reason
    });
    
    await leave.save();
    res.redirect('/employee-dashboard');
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
    const leaves = await Leave.find().populate('employeeId');
    res.render('lead-dashboard', { 
        userName: req.session.userName,
        leaves 
    });
});

app.get('/employees', requireAuth, requireLead, async (req, res) => {
    const employees = await User.find({ role: 'employee' }).sort({ name: 1 });
    res.render('employees', { 
        userName: req.session.userName,
        employees 
    });
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

// Chat Routes
app.get('/chat', requireAuth, async (req, res) => {
    const messages = await Chat.find().sort({ timestamp: -1 }).limit(50);
    res.render('chat', { 
        userName: req.session.userName,
        userRole: req.session.userRole,
        userId: req.session.userId,
        messages: messages.reverse()
    });
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