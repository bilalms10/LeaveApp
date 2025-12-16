const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb+srv://mohdbilal_db_user:mohdbilal123@bilalcluster.q2ynbwr.mongodb.net/leave_management?retryWrites=true&w=majority&appName=BilalCluster');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;