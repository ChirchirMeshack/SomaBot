# WhatsApp Microlearning Bot - Architecture Documentation

## 🏗️ **System Architecture Overview**

This document outlines the complete architecture for the WhatsApp Microlearning Coach bot, designed as a cost-effective MVP with Node.js + Express.js backend.

## 📁 **Project Structure**

```
whatsapp-learning-bot/
├── src/
│   ├── controllers/           # Handle HTTP requests and WhatsApp webhooks
│   │   ├── authController.js  # Admin authentication
│   │   ├── botController.js   # WhatsApp message handling
│   │   ├── lessonController.js # Lesson management
│   │   ├── userController.js  # User management
│   │   ├── quizController.js  # Quiz interactions
│   │   └── adminController.js # Admin dashboard API
│   ├── services/              # Business logic layer
│   │   ├── whatsappService.js # WhatsApp API integration
│   │   ├── aiService.js       # OpenAI integration
│   │   ├── lessonService.js   # Lesson delivery logic
│   │   ├── progressService.js # Progress tracking
│   │   ├── paymentService.js  # M-PESA & Stripe integration
│   │   ├── certificateService.js # Certificate generation
│   │   └── schedulerService.js # Cron jobs for reminders
│   ├── models/                # Database models (PostgreSQL)
│   │   ├── User.js           # User schema and methods
│   │   ├── Lesson.js         # Lesson content schema
│   │   ├── Course.js         # Course structure
│   │   ├── Progress.js       # User progress tracking
│   │   ├── Quiz.js           # Quiz questions and answers
│   │   ├── Badge.js          # Achievement badges
│   │   └── Subscription.js   # Payment subscriptions
│   ├── middleware/            # Express middleware
│   │   ├── auth.js           # JWT authentication
│   │   ├── rateLimiter.js    # Rate limiting
│   │   ├── validation.js     # Input validation
│   │   └── errorHandler.js   # Global error handling
│   ├── routes/                # API route definitions
│   │   ├── bot.js            # WhatsApp webhook routes
│   │   ├── admin.js          # Admin dashboard routes
│   │   ├── users.js          # User management routes
│   │   ├── lessons.js        # Lesson CRUD routes
│   │   └── payments.js       # Payment webhook routes
│   ├── utils/                 # Utility functions
│   │   ├── database.js       # DB connection and queries
│   │   ├── redis.js          # Redis connection
│   │   ├── logger.js         # Winston logging setup
│   │   ├── constants.js      # App constants
│   │   ├── helpers.js        # Common helper functions
│   │   └── validators.js     # Input validation schemas
│   ├── jobs/                  # Background jobs
│   │   ├── reminderJob.js    # Daily reminder sender
│   │   ├── streakJob.js      # Streak calculation
│   │   └── analyticsJob.js   # Analytics aggregation
│   ├── templates/             # Message and certificate templates
│   │   ├── messages/         # WhatsApp message templates
│   │   └── certificates/     # PDF certificate templates
│   └── config/                # Configuration files
│       ├── database.js       # DB configuration
│       ├── redis.js          # Redis configuration
│       └── environment.js    # Environment variables
├── tests/                     # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── fixtures/             # Test data
├── docs/                      # Documentation
├── scripts/                   # Deployment and setup scripts
├── .env.example              # Environment variables template
├── package.json
├── tsconfig.json             # TypeScript configuration
├── docker-compose.yml        # Local development setup
└── README.md
```

## 🎯 **Component Responsibilities**

### **Controllers Layer** (Request Handlers)
- **botController.js**: Processes incoming WhatsApp messages, routes to appropriate services
- **lessonController.js**: Handles lesson CRUD operations for admin dashboard
- **userController.js**: Manages user profiles, preferences, and progress
- **quizController.js**: Processes quiz submissions and scoring
- **adminController.js**: Provides analytics and management endpoints

### **Services Layer** (Business Logic)
- **whatsappService.js**: Abstracts WhatsApp API calls, message formatting
- **aiService.js**: Handles OpenAI integration for personalized tutoring
- **lessonService.js**: Manages lesson scheduling, delivery, and sequencing
- **progressService.js**: Tracks user progress, calculates streaks, awards badges
- **paymentService.js**: Handles subscription payments via M-PESA and Stripe
- **certificateService.js**: Generates and delivers PDF certificates

### **Models Layer** (Data Access)
- **User.js**: User profiles, preferences, subscription status
- **Lesson.js**: Lesson content, metadata, media links
- **Progress.js**: Completion tracking, quiz scores, time spent
- **Course.js**: Course structure, prerequisites, learning paths

## 🗄️ **State Management & Data Flow**

### **Database State (PostgreSQL)**
```sql
-- Primary data storage
Users: { id, phone, name, subscription_tier, preferences, created_at }
Courses: { id, title, description, difficulty, category }
Lessons: { id, course_id, title, content, media_url, order }
Progress: { user_id, lesson_id, completed_at, score, time_spent }
Subscriptions: { user_id, plan, status, expires_at, payment_method }
```

### **Session State (Redis)**
```javascript
// Temporary conversation state
user_session:{phone_number} = {
  current_lesson: "python_basics_1",
  awaiting_quiz: true,
  conversation_context: "learning_path_selection",
  last_activity: timestamp
}

// Rate limiting
rate_limit:{phone_number} = {
  requests: 5,
  window: "1hour"
}
```

### **Application State (Memory)**
- **Active WebSocket connections** for real-time admin dashboard
- **Cached lesson content** for fast delivery
- **AI conversation contexts** for personalized responses

## 🔄 **Service Interconnections**

### **Message Flow Architecture**
```
WhatsApp User → Twilio Webhook → botController → Services → Database
                                      ↓
Admin Dashboard ← API Routes ← Services ← Database Updates
```

### **Key Service Interactions**

#### **1. Incoming Message Processing**
```javascript
// botController.js
const handleIncomingMessage = async (req, res) => {
  const { From, Body } = req.body;
  
  // Check user session in Redis
  const session = await redisService.getSession(From);
  
  // Route based on message content and context
  if (session.awaiting_quiz) {
    await quizService.processAnswer(From, Body, session);
  } else if (Body.startsWith('/')) {
    await commandService.processCommand(From, Body);
  } else {
    await aiService.handleConversation(From, Body, session);
  }
};
```

#### **2. Lesson Delivery System**
```javascript
// lessonService.js
const deliverDailyLesson = async (userId) => {
  // Get user progress and preferences
  const progress = await progressService.getUserProgress(userId);
  const nextLesson = await findNextLesson(progress);
  
  // Personalize content with AI
  const personalizedContent = await aiService.personalizeLesson(
    nextLesson, 
    progress.learning_style
  );
  
  // Send via WhatsApp
  await whatsappService.sendLesson(userId, personalizedContent);
  
  // Schedule follow-up quiz
  await schedulerService.scheduleQuiz(userId, nextLesson.id, '30min');
};
```

#### **3. Progress Tracking Flow**
```javascript
// progressService.js
const updateProgress = async (userId, lessonId, score) => {
  // Update database
  await Progress.updateCompletion(userId, lessonId, score);
  
  // Check for badge eligibility
  const badges = await checkBadgeEligibility(userId);
  
  // Update streak
  const streak = await updateLearningStreak(userId);
  
  // Send congratulations if milestone reached
  if (badges.length > 0) {
    await whatsappService.sendBadgeNotification(userId, badges);
  }
};
```

## 💾 **Data Persistence Strategy**

### **PostgreSQL (Primary Database)**
- **User profiles and preferences**
- **Course content and structure**
- **Progress tracking and analytics**
- **Subscription and payment records**
- **Certificates and achievements**

### **Redis (Session & Cache)**
- **User conversation sessions** (TTL: 1 hour)
- **Rate limiting counters** (TTL: based on window)
- **Cached lesson content** (TTL: 24 hours)
- **Temporary quiz states** (TTL: 30 minutes)

### **File Storage (Cloudinary)**
- **Lesson media files** (images, audio, video)
- **Generated certificates** (PDFs)
- **User profile pictures**
- **Badge and achievement images**

## 🔧 **Configuration Management**

### **Environment Variables**
```javascript
// config/environment.js
module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  
  // Database
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
  
  // Redis
  REDIS_URL: process.env.REDIS_URL,
  
  // WhatsApp
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER,
  
  // AI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Payments
  MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  
  // Storage
  CLOUDINARY_URL: process.env.CLOUDINARY_URL,
};
```

## 🚀 **Startup Sequence**

### **Application Bootstrap**
```javascript
// src/server.js
const startServer = async () => {
  // 1. Load environment configuration
  const config = require('./config/environment');
  
  // 2. Initialize database connections
  await database.connect();
  await redis.connect();
  
  // 3. Set up Express middleware
  app.use(express.json());
  app.use(rateLimiter);
  app.use(errorHandler);
  
  // 4. Register routes
  app.use('/api/bot', botRoutes);
  app.use('/api/admin', adminRoutes);
  
  // 5. Start background jobs
  await schedulerService.startCronJobs();
  
  // 6. Start server
  app.listen(config.PORT);
};
```

## 🔄 **Background Jobs & Scheduling**

### **Cron Jobs Setup**
```javascript
// jobs/reminderJob.js
const cron = require('node-cron');

// Send daily lesson reminders at 9 AM
cron.schedule('0 9 * * *', async () => {
  const inactiveUsers = await User.findInactiveUsers();
  
  for (const user of inactiveUsers) {
    await whatsappService.sendReminder(user.phone, 
      "🌟 Ready for today's 5-minute lesson? Reply 'START' to continue learning!"
    );
  }
});

// Calculate weekly streaks every Sunday
cron.schedule('0 0 * * 0', async () => {
  await progressService.calculateWeeklyStreaks();
});
```

## 🔒 **Security & Authentication**

### **API Security**
- **Rate limiting**: 100 requests/hour per phone number
- **Input validation**: All user inputs sanitized
- **JWT tokens**: Admin dashboard authentication
- **Webhook verification**: Twilio signature validation

### **Data Protection**
- **Encryption**: Sensitive data encrypted at rest
- **GDPR compliance**: User data deletion endpoints
- **Access control**: Role-based permissions for admin features

## 📊 **Monitoring & Analytics**

### **Key Metrics Tracking**
- **User engagement**: Daily active users, lesson completion rates
- **Learning progress**: Average course completion time, quiz scores
- **Business metrics**: Subscription conversions, churn rate
- **Technical metrics**: API response times, error rates

### **Logging Strategy**
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 🔄 **Deployment Architecture**

### **Production Environment**
- **Application**: Railway (Node.js hosting)
- **Database**: Railway PostgreSQL addon
- **Cache**: Railway Redis addon
- **File Storage**: Cloudinary
- **Monitoring**: Built-in Railway metrics + custom analytics

### **CI/CD Pipeline**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      - name: Deploy
        run: railway up
```

## 🔧 **Development Setup**

### **Local Development**
```bash
# 1. Clone and install
git clone <repo>
npm install

# 2. Setup environment
cp .env.example .env
# Fill in your API keys

# 3. Start services
docker-compose up -d  # Start PostgreSQL + Redis
npm run migrate       # Run database migrations
npm run seed          # Seed initial data

# 4. Start development server
npm run dev
```

## 📈 **Scaling Strategy**

### **Horizontal Scaling Points**
- **Database**: Read replicas for analytics queries
- **Cache**: Redis cluster for high-traffic periods
- **Background jobs**: Separate worker processes
- **File processing**: Queue-based video/audio processing

### **Performance Optimizations**
- **Database indexing**: Optimize frequent queries
- **Content CDN**: Cache static lesson content globally
- **API caching**: Cache course catalogs and user preferences
- **Batch processing**: Group WhatsApp messages for efficiency

This architecture provides a solid foundation for the MVP while maintaining flexibility for future enhancements and scaling needs.