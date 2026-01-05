# Quick Start Guide - Mondo Client Portal

## 🚀 Option 1: Run Locally (Recommended for Testing)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Initialize Database with Demo Data
```bash
npm run init-db
```

This creates a SQLite database with two demo accounts:
- **Admin**: `admin@mondosolutions.com` / `password123`
- **Client**: `client@example.com` / `password123`

### Step 3: Start the Server
```bash
npm start
```

Server will start on **http://localhost:8080**

### Step 4: Open in Browser
Navigate to: **http://localhost:8080**

You'll be redirected to the login page. Use the demo credentials above.

---

## 🌐 Option 2: Deploy to Fly.io

Your app is configured for Fly.io deployment with app name: `mondo-portal`

### Deploy:
```bash
fly deploy
```

### Access:
Once deployed, your app will be available at:
**https://mondo-portal.fly.dev**

---

## ✅ Testing Features

Once logged in, test these features:

### 1. Dashboard (index.html)
- View real-time stats (revenue, transactions, projects, events)
- Check recent transactions table
- Verify data loads from backend

### 2. Calendar (calendar.html)
- Create new events by clicking on dates
- Drag and drop events to reschedule
- Edit/delete existing events
- All changes persist to database

### 3. Email System
- **Inbox** (email-inbox.html) - View received emails
- **Compose** (email-compose.html) - Send emails to other users
- **Read** (email-read.html) - View email details
- Star/archive functionality

### 4. User Profile
- Click on your profile to update information
- Change settings

### 5. Authentication
- Logout and try registering a new account
- Test password recovery flow

---

## 🔑 Demo Accounts

### Admin Account
- **Email**: admin@mondosolutions.com
- **Password**: password123
- **Role**: admin
- **Features**: Full access

### Client Account
- **Email**: client@example.com
- **Password**: password123
- **Role**: client
- **Includes**:
  - 4 sample transactions
  - 2 calendar events
  - 30 days of analytics data
  - 1 active project

---

## 📊 API Testing

### Test API Endpoints with curl:

**Login:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@example.com","password":"password123"}'
```

**Get Dashboard Stats (requires token):**
```bash
curl http://localhost:8080/api/dashboard/overview \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8080
lsof -i :8080
kill -9 <PID>
```

### Reset Database
```bash
rm -rf data/
npm run init-db
```

### Check Server Logs
Server logs will appear in the terminal where you ran `npm start`

---

## 📁 Project Structure

```
Mondo_Portal/
├── server/              # Backend API
│   ├── routes/         # API endpoints
│   ├── config/         # Database setup
│   └── middleware/     # Auth middleware
├── assets/             # Frontend assets
│   └── js/
│       ├── api-client.js       # API wrapper
│       └── pages/              # Page handlers
├── *.html              # Frontend pages
└── data/               # SQLite database (auto-created)
```

---

## 🎯 What's Working

✅ User authentication (login, register, logout)
✅ Dashboard with live stats
✅ Calendar with full CRUD operations
✅ Email system (send, read, manage)
✅ Transaction tracking
✅ User profiles and settings
✅ JWT session management
✅ All API endpoints functional

---

## 📚 Full Documentation

See **README.md** for:
- Complete API documentation
- Database schema
- Deployment guides
- Security features
- Development tips

---

**Enjoy testing the Mondo Client Portal!** 🎉
