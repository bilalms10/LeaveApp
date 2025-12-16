const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/database');

// User Schema (same as in server.js)
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

const employees = [
    { name: 'Althaf KN', employeeId: 'RW/2883', dateOfJoining: '2025-02-20', phone: '9744733234', email: 'althaf.kn@railwire.co.in' },
    { name: 'Jayakrishnan U', employeeId: 'RW/2919', dateOfJoining: '2025-03-21', phone: '9846869173', email: 'jayakrishanan.u@railwire.co.in' },
    { name: 'Nafas Siraj', employeeId: 'RW/2992', dateOfJoining: '2025-06-13', phone: '9747413208', email: 'nafas.siraj@railwire.co.in' },
    { name: 'Sajeev K Gokuldas', employeeId: 'RW/2993', dateOfJoining: '2025-06-13', phone: '8075872380', email: 'sajeev.gokuldas@railwire.co.in' },
    { name: 'Shine Santhosh', employeeId: 'RW/3101', dateOfJoining: '2025-09-22', phone: '7902707257', email: 'shine.santhosh@railwire.co.in' },
    { name: 'Abhay R', employeeId: 'RW/3102', dateOfJoining: '2025-09-25', phone: '8301868290', email: 'abhay.r@railwire.co.in' },
    { name: 'Adithyan N K', employeeId: 'RW/3103', dateOfJoining: '2025-09-25', phone: '8111820118', email: 'adithyan.nk@railwire.co.in' },
    { name: 'Fadlul Abid P K', employeeId: 'RW/3105', dateOfJoining: '2025-09-27', phone: '8086139100', email: 'fadlul.k@railwire.co.in' },
    { name: 'Milan K J', employeeId: 'RW/3107', dateOfJoining: '2025-09-27', phone: '8111938783', email: 'm8111938783@gmail.com' },
    { name: 'Akhil Divakaran', employeeId: 'RW/3138', dateOfJoining: '2025-11-15', phone: '9447658377', email: 'akhil.divakaran@railwire.co.in' }
];

const seedEmployees = async () => {
    try {
        await connectDB();
        
        const hashedPassword = await bcrypt.hash('password', 10);
        
        for (const emp of employees) {
            const existingUser = await User.findOne({ email: emp.email });
            if (!existingUser) {
                const user = new User({
                    name: emp.name,
                    email: emp.email,
                    password: hashedPassword,
                    role: 'employee',
                    employeeId: emp.employeeId,
                    phone: emp.phone,
                    dateOfJoining: new Date(emp.dateOfJoining)
                });
                await user.save();
                console.log(`Created user: ${emp.name} (${emp.employeeId})`);
            } else {
                console.log(`User already exists: ${emp.name}`);
            }
        }
        
        console.log('Employee seeding completed!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding employees:', error);
        process.exit(1);
    }
};

seedEmployees();