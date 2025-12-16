const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/database');

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: { type: String, enum: ['employee', 'lead'], default: 'employee' },
    employeeId: String,
    phone: String,
    dateOfJoining: Date
});

const User = mongoose.model('User', userSchema);

const createLead = async () => {
    try {
        await connectDB();
        
        const hashedPassword = await bcrypt.hash('password', 10);
        
        const existingLead = await User.findOne({ email: 'muhammed.bilal@railwire.co.in' });
        if (!existingLead) {
            const lead = new User({
                name: 'Muhammed Bilal MS',
                email: 'muhammed.bilal@railwire.co.in',
                password: hashedPassword,
                role: 'lead',
                employeeId: 'RW/1950',
                phone: '9072331194',
                dateOfJoining: new Date()
            });
            await lead.save();
            console.log('Lead created: Muhammed Bilal MS (RW/1950)');
        } else {
            console.log('Lead already exists');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating lead:', error);
        process.exit(1);
    }
};

createLead();