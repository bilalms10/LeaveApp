const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// JWT Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

module.exports = (User, Leave, Chat) => {
    // Login API
    router.post('/auth/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email });
            
            if (!user || !await bcrypt.compare(password, user.password)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { userId: user._id, role: user.role, name: user.name },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    employeeId: user.employeeId
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get leaves
    router.get('/leaves', authenticateToken, async (req, res) => {
        try {
            const query = req.user.role === 'lead' ? {} : { employeeId: req.user.userId };
            const leaves = await Leave.find(query).populate('employeeId', 'name email');
            res.json(leaves);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Apply leave
    router.post('/leaves', authenticateToken, async (req, res) => {
        try {
            const { startDate, endDate, reason } = req.body;
            const user = await User.findById(req.user.userId);
            
            const leave = new Leave({
                employeeId: req.user.userId,
                employeeName: req.user.name,
                employeeCode: user.employeeId,
                startDate,
                endDate,
                reason
            });
            
            await leave.save();
            res.status(201).json(leave);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Update leave status
    router.put('/leaves/:id/status', authenticateToken, async (req, res) => {
        try {
            if (req.user.role !== 'lead') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const { status } = req.body;
            const leave = await Leave.findByIdAndUpdate(
                req.params.id,
                { 
                    status,
                    reviewedBy: req.user.name,
                    reviewedAt: new Date()
                },
                { new: true }
            );

            if (!leave) {
                return res.status(404).json({ error: 'Leave not found' });
            }

            res.json(leave);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get employees
    router.get('/employees', authenticateToken, async (req, res) => {
        try {
            if (req.user.role !== 'lead') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const employees = await User.find({ role: 'employee' }).select('-password');
            res.json(employees);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get chat messages
    router.get('/chat', authenticateToken, async (req, res) => {
        try {
            const messages = await Chat.find().sort({ timestamp: -1 }).limit(50);
            res.json(messages.reverse());
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Send chat message
    router.post('/chat', authenticateToken, async (req, res) => {
        try {
            const { message } = req.body;
            
            const chat = new Chat({
                senderId: req.user.userId,
                senderName: req.user.name,
                senderRole: req.user.role,
                message
            });
            
            await chat.save();
            res.status(201).json(chat);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};