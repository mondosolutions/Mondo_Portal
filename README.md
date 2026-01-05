# Mondo Client Portal

A full-featured marketing client portal built with Node.js, Express, and SQLite, featuring a responsive Bootstrap 4 frontend.

## Features

### Authentication & User Management
- Secure JWT-based authentication
- User registration and login
- Password recovery
- Session management
- User profiles and settings

### Dashboard
- Real-time analytics and metrics
- Revenue tracking
- Transaction management
- Active projects overview
- Upcoming events calendar

### Calendar System
- Full calendar with event management
- Drag-and-drop event scheduling
- Event creation, editing, and deletion
- Color-coded events
- All-day and timed events support

### Email System
- Inbox management
- Compose and send emails
- Draft saving
- Star/archive functionality
- Unread count tracking
- Email filtering

### Transaction Management
- Transaction tracking
- Income and expense categorization
- Status tracking (pending, completed, failed, cancelled)
- Pagination and filtering
- Detailed transaction views

### Analytics
- Sales charts with configurable time periods
- Traffic and engagement metrics
- Revenue tracking
- Custom analytics dashboard

## Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** SQLite (better-sqlite3)
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Validation:** express-validator
- **File Uploads:** Multer
- **Security:** Helmet, CORS

### Frontend
- **Framework:** Bootstrap 4
- **JavaScript:** Vanilla JS with jQuery
- **Charts:** ApexCharts, Morris.js, Chart.js
- **Calendar:** FullCalendar
- **Rich Text Editors:** Summernote, CKEditor, TinyMCE
- **Data Tables:** DataTables
- **Icons:** Unicons, Material Design, FontAwesome

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Local Development

1. **Clone the repository:**
```bash
git clone <repository-url>
cd Mondo_Portal
```

2. **Install dependencies:**
```bash
npm install
```

3. **Initialize the database:**
```bash
npm run init-db
```

This will create a SQLite database with sample data including two demo accounts:
- Admin: `admin@mondosolutions.com` / `password123`
- Client: `client@example.com` / `password123`

4. **Configure environment variables:**

Create or edit the `.env` file:
```env
NODE_ENV=development
PORT=8080
JWT_SECRET=your-secure-random-secret-key-here
```

**Important:** Change the `JWT_SECRET` to a secure random string in production!

5. **Start the development server:**
```bash
npm run dev
```

Or for production:
```bash
npm start
```

6. **Access the portal:**

Open your browser and navigate to:
```
http://localhost:8080
```

You'll be redirected to the login page. Use one of the demo accounts to sign in.

## Project Structure

```
Mondo_Portal/
├── assets/                  # Frontend assets
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript files
│   │   ├── api-client.js  # API client wrapper
│   │   ├── pages/         # Page-specific scripts
│   │   └── mondo.js       # Custom scripts
│   ├── images/            # Images and logos
│   └── libs/              # Third-party libraries
├── server/                 # Backend server
│   ├── config/            # Configuration
│   │   └── database.js    # Database setup
│   ├── middleware/        # Express middleware
│   │   └── auth.js        # Authentication middleware
│   ├── routes/            # API routes
│   │   ├── auth.js        # Authentication endpoints
│   │   ├── calendar.js    # Calendar endpoints
│   │   ├── dashboard.js   # Dashboard endpoints
│   │   ├── email.js       # Email endpoints
│   │   ├── settings.js    # Settings endpoints
│   │   ├── transactions.js # Transaction endpoints
│   │   └── users.js       # User endpoints
│   ├── scripts/           # Utility scripts
│   │   └── init-db.js     # Database initialization
│   └── index.js           # Server entry point
├── data/                   # SQLite database (gitignored)
├── *.html                  # Frontend pages
├── package.json           # Dependencies and scripts
├── Dockerfile             # Docker configuration
├── .env                   # Environment variables (gitignored)
└── README.md              # This file
```

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "company": "Acme Inc"
}
```

#### POST `/api/auth/login`
Login to existing account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "client"
  }
}
```

#### POST `/api/auth/logout`
Logout current user (requires authentication).

#### GET `/api/auth/me`
Get current user info (requires authentication).

### Dashboard Endpoints (All require authentication)

#### GET `/api/dashboard/overview`
Get dashboard overview statistics.

#### GET `/api/dashboard/recent-transactions?limit=10`
Get recent transactions.

#### GET `/api/dashboard/sales-chart?period=month`
Get sales chart data (period: day, week, month, year).

### Calendar Endpoints (All require authentication)

#### GET `/api/calendar?start=2024-01-01&end=2024-12-31`
Get all calendar events.

#### POST `/api/calendar`
Create new event.

**Request Body:**
```json
{
  "title": "Client Meeting",
  "description": "Monthly review",
  "start": "2024-01-15T10:00:00",
  "end": "2024-01-15T11:00:00",
  "all_day": false,
  "color": "#4CAF50"
}
```

#### PUT `/api/calendar/:id`
Update event.

#### DELETE `/api/calendar/:id`
Delete event.

### Email Endpoints (All require authentication)

#### GET `/api/email/inbox?page=1&limit=20`
Get inbox emails.

#### POST `/api/email`
Send email.

**Request Body:**
```json
{
  "to_user_id": 2,
  "subject": "Meeting Request",
  "body": "Let's schedule a meeting...",
  "is_draft": false
}
```

#### PATCH `/api/email/:id`
Update email (star, mark as read, archive).

### Transaction Endpoints (All require authentication)

#### GET `/api/transactions?page=1&limit=50&status=completed&type=income`
Get all transactions with filtering.

#### POST `/api/transactions`
Create new transaction.

### User Endpoints (All require authentication)

#### GET `/api/users/profile`
Get user profile.

#### PUT `/api/users/profile`
Update user profile.

## Deployment

### Docker Deployment

1. **Build the Docker image:**
```bash
docker build -t mondo-portal .
```

2. **Run the container:**
```bash
docker run -p 8080:8080 \
  -e JWT_SECRET=your-secret-key \
  -e NODE_ENV=production \
  mondo-portal
```

### Fly.io Deployment

The application is configured for Fly.io deployment:

1. **Install Fly CLI:**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login to Fly.io:**
```bash
fly auth login
```

3. **Deploy:**
```bash
fly deploy
```

The app will be deployed using the configuration in `fly.toml`.

### Environment Variables for Production

Set these environment variables in production:

- `NODE_ENV=production`
- `PORT=8080`
- `JWT_SECRET=<your-secure-random-key>`

**Important:** Never commit `.env` files or expose JWT secrets!

## Database

The application uses SQLite for data persistence. The database is automatically created and initialized when you run `npm run init-db`.

### Database Schema

- **users** - User accounts and profiles
- **sessions** - Authentication sessions
- **transactions** - Financial transactions
- **calendar_events** - Calendar events
- **emails** - Internal messaging
- **analytics** - Analytics and metrics
- **settings** - User preferences
- **projects** - Marketing projects/campaigns

### Resetting the Database

To reset the database and start fresh:

```bash
rm -rf data/
npm run init-db
```

## Security

- Passwords are hashed using bcryptjs
- JWT tokens expire after 7 days
- Sessions are validated on every request
- SQL injection protected through parameterized queries
- XSS protection via Helmet middleware
- CORS configured for production
- Input validation on all endpoints

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize/reset database

### Adding New Features

1. Create API routes in `server/routes/`
2. Add middleware if needed in `server/middleware/`
3. Update database schema in `server/config/database.js`
4. Create frontend integration in `assets/js/pages/`
5. Update HTML pages as needed

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8080
lsof -i :8080
# Kill the process
kill -9 <PID>
```

### Database Locked Error
```bash
# Stop the server
# Delete the database
rm data/mondo.db
# Reinitialize
npm run init-db
```

### Cannot Connect to API
- Check that the server is running
- Verify PORT environment variable
- Check browser console for errors
- Ensure you're logged in (check localStorage for token)

## Support

For issues or questions:
1. Check this README
2. Review the code comments
3. Check the browser console for errors
4. Review server logs

## License

ISC

## Credits

- **Template Base:** Xoric Bootstrap Admin Template
- **Customization:** Mondo Solutions
- **Backend Development:** Custom implementation

---

**© 2024 Mondo Solutions. All rights reserved.**
