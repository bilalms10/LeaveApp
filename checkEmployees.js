const mongoose = require('mongoose');
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

const checkEmployees = async () => {
    try {
        await connectDB();
        
        const allUsers = await User.find();
        console.log('Total users in database:', allUsers.length);
        
        allUsers.forEach(user => {
            console.log(`Name: ${user.name}, Role: ${user.role}, Email: ${user.email}`);
        });
        
        const employees = await User.find({ role: 'employee' });
        console.log('\nEmployees found:', employees.length);
        
        const leads = await User.find({ role: 'lead' });
        console.log('Leads found:', leads.length);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkEmployees();