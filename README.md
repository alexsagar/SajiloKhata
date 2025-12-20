# SajiloKhata - Smart Expense Sharing

A modern expense sharing application built with MERN stack and Next.js, featuring AI-powered features, real-time collaboration, and comprehensive analytics.

## 🚀 Features

### Core Functionality
- **Expense Management**: Create, track, and split expenses with friends, family, and groups
- **Real-time Collaboration**: Live updates and notifications for expense changes
- **AI-Powered Features**: Smart expense categorization and receipt processing
- **Multi-Currency Support**: Handle expenses in different currencies with automatic conversion
- **Comprehensive Analytics**: Detailed insights into spending patterns and group dynamics

### Advanced Features
- **Calendar Integration**: View and create expenses directly from a calendar interface
- **Receipt Processing**: OCR-powered receipt scanning and expense extraction
- **Offline Support**: Work without internet connection with automatic sync
- **Team Management**: Create teams with billing and subscription management
- **Admin Dashboard**: Comprehensive system administration and monitoring

## 💰 Centralized Currency System

The application now features a **centralized currency system** that automatically applies the user's preferred currency across all pages and features:

### How It Works
1. **User Preference**: Users set their preferred currency in Settings → Preferences
2. **Automatic Application**: The chosen currency is automatically used across:
   - Calendar view and expense creation
   - Analytics dashboard and charts
   - Expense lists and summaries
   - All monetary displays and calculations
3. **Consistent Experience**: No need to select currency on individual pages

### Benefits
- **Consistency**: Same currency displayed everywhere based on user preference
- **User Experience**: No confusion about which currency is being shown
- **Maintenance**: Single source of truth for currency preferences
- **Accessibility**: Users always see amounts in their familiar currency

### Technical Implementation
- **Currency Context**: React context that provides currency throughout the app
- **Automatic API Calls**: All analytics and calendar API calls include the user's preferred currency
- **Real-time Updates**: Currency changes in settings immediately reflect across the app
- **Fallback Handling**: Graceful fallback to USD if no preference is set

## 📱 Calendar Extension

### New Features
- **Date Click → Expense Creation**: Click any date to open expense creation modal
- **Monthly Expense Summary**: View daily totals and monthly summaries
- **Real-time Data**: Calendar shows actual expense data from the backend
- **Filter System**: Toggle between Personal/Group/All modes with group selection
- **Analytics Integration**: Direct link to analytics with matching filters

### Implementation Details
- **Backend API**: New `/api/calendar/month` endpoint with base currency support
- **Frontend Integration**: Enhanced calendar component with expense creation
- **Data Flow**: Calendar data automatically flows into analytics system
- **ACL Enforcement**: Users only see groups they belong to

## 🏗️ Architecture

### Backend (Node.js + Express)
- **MongoDB**: Document-based database with Mongoose ODM
- **Authentication**: JWT-based auth with CSRF protection
- **API Design**: RESTful endpoints with consistent response formats
- **Validation**: Input validation using express-validator
- **Error Handling**: Centralized error handling with proper HTTP status codes

### Frontend (Next.js 14 + React)
- **App Router**: Modern Next.js routing with server components
- **State Management**: React Query for server state, Context for client state
- **UI Components**: Shadcn/UI components with Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **Responsive Design**: Mobile-first approach with responsive layouts

### Key Technologies
- **Database**: MongoDB with Mongoose
- **Backend**: Node.js, Express.js
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/UI
- **State Management**: React Query, React Context
- **Authentication**: JWT, CSRF tokens
- **Real-time**: Socket.io for live updates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/splitwise.git
   cd splitwise
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Backend (.env)
   MONGODB_URI=mongodb://localhost:27017/splitwise
   JWT_SECRET=your_jwt_secret
   PORT=5000
   
   # Frontend (.env.local)
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. **Start the application**
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend (new terminal)
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

## 📊 Analytics System

### Available Endpoints
- **KPIs**: `/api/analytics/kpis` - Key performance indicators
- **Spend Over Time**: `/api/analytics/spend-over-time` - Time-based spending analysis
- **Category Breakdown**: `/api/analytics/category-breakdown` - Spending by category
- **Top Partners**: `/api/analytics/top-partners` - Most frequent expense partners
- **Balance Matrix**: `/api/analytics/balance-matrix` - Group debt relationships
- **Aging Analysis**: `/api/analytics/aging` - Outstanding debt aging
- **Data Export**: `/api/analytics/export/csv` - CSV export functionality

### Features
- **Multi-Currency Support**: All amounts converted to user's base currency
- **Real-time Updates**: Live data refresh with React Query
- **Advanced Filtering**: Filter by mode, time range, groups, categories, etc.
- **Interactive Charts**: Recharts-based visualizations
- **Responsive Design**: Works on all device sizes

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **CSRF Protection**: Cross-site request forgery prevention
- **Input Validation**: Server-side validation for all inputs
- **ACL Enforcement**: Access control for group and expense data
- **Rate Limiting**: API rate limiting for abuse prevention
- **Secure Headers**: Security headers for XSS and other attacks

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Test Coverage
- Unit tests for utility functions
- API endpoint testing
- Component testing with React Testing Library
- Integration tests for critical user flows

## 📈 Performance Optimizations

- **Database Indexing**: Optimized MongoDB queries with proper indexes
- **API Caching**: React Query for intelligent caching and background updates
- **Code Splitting**: Dynamic imports for heavy components
- **Image Optimization**: Next.js Image component with automatic optimization
- **Bundle Analysis**: Regular bundle size monitoring and optimization

## 🚀 Deployment

### Backend Deployment
- **Environment Variables**: Configure production environment variables
- **Database**: Use MongoDB Atlas or self-hosted MongoDB
- **Process Manager**: Use PM2 or similar for production process management
- **SSL**: Enable HTTPS with proper SSL certificates

### Frontend Deployment
- **Build Optimization**: Production build with Next.js
- **CDN**: Use CDN for static assets
- **Environment**: Configure production API endpoints
- **Monitoring**: Implement error tracking and performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain consistent code formatting
- Write comprehensive tests for new features
- Update documentation for API changes
- Follow the existing code structure and patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation for endpoint details

## 🔮 Roadmap

### Upcoming Features
- **Mobile App**: React Native mobile application
- **Advanced AI**: Machine learning for expense predictions
- **Internationalization**: Multi-language support
- **Advanced Reporting**: Custom report builder
- **Integration APIs**: Third-party service integrations

### Performance Improvements
- **GraphQL**: Implement GraphQL for more efficient data fetching
- **Real-time Analytics**: Live dashboard updates
- **Advanced Caching**: Redis-based caching layer
- **Microservices**: Break down into microservices architecture

---

**SajiloKhata** - Making expense sharing simple, smart, and secure.


