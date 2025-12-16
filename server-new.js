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

const User = mongoose.model('User', userSchema);
const Leave = mongoose.model('Leave', leaveSchema);

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
    res.render('index');
});

app.get('/test', (req, res) => {
    res.send('NEW SERVER IS WORKING!');
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

app.get('/employees', async (req, res) => {
    try {
        console.log('EMPLOYEES ROUTE HIT');
        console.log('Session:', req.session);
        
        if (!req.session.userId) {
            console.log('No session, redirecting to login');
            return res.redirect('/login');
        }
        
        if (req.session.userRole !== 'lead') {
            console.log('Not a lead, redirecting to employee dashboard');
            return res.redirect('/employee-dashboard');
        }
        
        const employees = await User.find({ role: 'employee' }).sort({ name: 1 });
        console.log('Found employees:', employees.length);
        
        res.render('employees', { 
            userName: req.session.userName,
            employees 
        });
    } catch (error) {
        console.error('Error in employees route:', error);
        res.status(500).send('Error: ' + error.message);
    }
});

app.get('/lead-dashboard', requireAuth, requireLead, async (req, res) => {
    const leaves = await Leave.find().populate('employeeId');
    res.render('lead-dashboard', { 
        userName: req.session.userName,
        leaves 
    });
});

app.get('/employee-dashboard', requireAuth, async (req, res) => {
    const leaves = await Leave.find({ employeeId: req.session.userId });
    res.render('employee-dashboard', { 
        userName: req.session.userName,
        leaves 
    });
});

app.post('/reset-password/:id', requireAuth, requireLead, async (req, res) => {
    const hashedPassword = await bcrypt.hash('password', 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
    res.redirect('/employees');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`NEW SERVER running on port ${PORT}`);
});