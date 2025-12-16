# Leave Management System

A professional leave management system built with Node.js, Express, MongoDB, and EJS.

## Features

### 🏢 **Employee Management**
- Employee registration by leads only
- Professional employee cards with animations
- Password reset functionality
- Role-based access control

### 📋 **Leave Management**
- Apply for leave with date validation
- Leave approval/rejection by leads
- Leave history tracking
- Status notifications

### 💬 **Team Communication**
- Real-time team chat
- Role-based message identification
- Professional chat interface
- Message history

### 🎨 **Professional Design**
- Royal blue and gold color scheme
- Responsive design for all devices
- Smooth animations and transitions
- Modern card-based layouts

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Frontend**: EJS, CSS3, JavaScript
- **Authentication**: bcrypt, express-session
- **Styling**: Custom CSS with professional design system

## Installation

1. Clone the repository:
```bash
git clone https://github.com/bilalms10/LeaveApp.git
cd LeaveApp
```

2. Install dependencies:
```bash
npm install
```

3. Update MongoDB connection in `config/database.js`

4. Start the server:
```bash
npm start
```

5. Access the application at `http://localhost:3000`

## Default Credentials

### Lead Account
- **Email**: muhammed.bilal@railwire.co.in
- **Password**: password

### Employee Accounts
- **Email**: Any employee email from the seeded data
- **Password**: password

## Project Structure

```
leave-management-system/
├── config/
│   └── database.js          # MongoDB connection
├── public/
│   └── css/
│       └── style.css        # Professional styling
├── views/
│   ├── login.ejs           # Login page
│   ├── employee-dashboard.ejs
│   ├── lead-dashboard.ejs
│   ├── apply-leave.ejs
│   ├── change-password.ejs
│   ├── employees.ejs
│   ├── add-employee.ejs
│   └── chat.ejs            # Team chat
├── server.js               # Main server file
├── package.json
└── README.md
```

## Features Overview

### For Employees:
- ✅ View personal dashboard
- ✅ Apply for leave
- ✅ Change password
- ✅ Team chat access
- ✅ View leave history

### For Leads:
- ✅ All employee features
- ✅ Approve/reject leave requests
- ✅ Manage employees
- ✅ Add new employees
- ✅ Reset employee passwords
- ✅ View team statistics

## Design Highlights

- **Royal Blue & Gold Theme**: Professional corporate colors
- **Animated Cards**: Smooth hover effects and transitions
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Role-based UI**: Different interfaces for employees and leads
- **Real-time Chat**: Team communication with role identification

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Author

**Bilal MS** - [GitHub](https://github.com/bilalms10)

---

*Built with ❤️ for efficient leave management*