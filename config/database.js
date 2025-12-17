const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Optimize mongoose settings for performance
        mongoose.set('strictQuery', false);
        
        const connectionOptions = {
            maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
            minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 5,
            maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME) || 30000,
            serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 5000,
            socketTimeoutMS: 45000,
            bufferMaxEntries: 0,
            retryWrites: true,
            w: 'majority'
        };
        
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://mohdbilal_db_user:mohdbilal123@bilalcluster.q2ynbwr.mongodb.net/leave_management?retryWrites=true&w=majority&appName=BilalCluster';
        
        const conn = await mongoose.connect(mongoURI, connectionOptions);
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Connection pool size: ${connectionOptions.maxPoolSize}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });
        
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;