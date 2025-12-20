# Analytics System Documentation

## Overview

The Splitwise Analytics system provides comprehensive insights into both personal and group expenses, with support for multi-currency transactions and advanced filtering capabilities. The system is built with integer cents math for precision and includes proper ACL enforcement for data security.

## Architecture

### Backend Components

1. **Analytics Calculations Module** (`backend/utils/analytics-calcs.js`)
   - Pure functions for expense calculations
   - Integer cents math for precision
   - Split calculations (equal, weighted, percentage)
   - Balance and settlement algorithms

2. **Analytics API Routes** (`backend/routes/analytics.js`)
   - RESTful endpoints for all analytics data
   - ACL enforcement for group membership
   - Comprehensive filtering system
   - Multi-currency support

3. **Enhanced Data Models**
   - Expense model with `fxRate` and `settledAt` fields
   - User model with `baseCurrency` preference
   - Proper indexing for analytics queries

### Frontend Components

1. **Analytics Dashboard** (`frontend/src/components/analytics/analytics-dashboard.tsx`)
   - Comprehensive filter system
   - KPI cards and charts
   - Tabbed interface for different views
   - Client-side rendering for charts

2. **API Client** (`frontend/src/lib/api.ts`)
   - Type-safe API calls
   - Error handling and interceptors
   - Query caching with React Query

## API Endpoints

### Base URL
```
/api/analytics
```

### Authentication
All endpoints require valid JWT token in Authorization header.

### Common Query Parameters

All endpoints accept the following filter parameters:

```typescript
interface AnalyticsFilters {
  mode: 'personal' | 'group' | 'all'           // Expense type filter
  time: {
    range: 'THIS_MONTH' | 'LAST_3M' | 'YTD' | 'CUSTOM'
    from?: string                              // ISO date string for custom range
    to?: string                                // ISO date string for custom range
  }
  groupIds?: string[]                          // Specific groups to include
  categories?: string[]                        // Expense categories to filter
  paymentMethods?: string[]                    // Payment methods to filter
  currencies?: string[]                        // Currency codes to filter
  status?: string[]                            // Expense statuses to filter
  createdBy?: string[]                         // Users who created expenses
  paidBy?: string[]                            // Users who paid for expenses
  baseCurrency?: string                        // Base currency for calculations
}
```

### 1. KPIs Endpoint

**GET** `/api/analytics/kpis`

Returns key performance indicators for the filtered data.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSpendBaseCents": 150000,
    "netBalanceBaseCents": 2500,
    "expensesCount": {
      "personal": 5,
      "group": 12
    },
    "avgExpenseSizeBaseCents": 8823,
    "activeGroups": 3,
    "activeMembers": 8,
    "avgSettlementDays": 7,
    "baseCurrency": "USD"
  }
}
```

### 2. Spend Over Time

**GET** `/api/analytics/spend-over-time`

Returns daily spending data separated by personal vs group expenses.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "personal": {
        "amountCents": 2500,
        "baseCents": 2500,
        "count": 1
      },
      "group": {
        "amountCents": 5000,
        "baseCents": 5000,
        "count": 2
      }
    }
  ],
  "baseCurrency": "USD"
}
```

### 3. Category Breakdown

**GET** `/api/analytics/category-breakdown`

Returns spending breakdown by category with personal/group counts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "food",
      "totalCents": 50000,
      "totalBaseCents": 50000,
      "count": 8,
      "personal": 3,
      "group": 5
    }
  ],
  "baseCurrency": "USD"
}
```

### 4. Top Partners

**GET** `/api/analytics/top-partners`

Returns top users and groups by spending amount.

**Response:**
```json
{
  "success": true,
  "data": {
    "topUsers": [
      {
        "_id": "user123",
        "totalCents": 25000,
        "totalBaseCents": 25000,
        "count": 5,
        "name": "John Doe",
        "avatar": "avatar.jpg"
      }
    ],
    "topGroups": [
      {
        "_id": "group456",
        "totalCents": 50000,
        "totalBaseCents": 50000,
        "count": 10,
        "name": "Roommates",
        "memberCount": 4
      }
    ],
    "baseCurrency": "USD"
  }
}
```

### 5. Balance Matrix

**GET** `/api/analytics/balance-matrix?groupId=123`

Returns detailed balance matrix for group members (requires group membership).

**Response:**
```json
{
  "success": true,
  "data": {
    "balanceMatrix": {
      "user1": {
        "user1": 0,
        "user2": 0,
        "user3": 0
      },
      "user2": {
        "user1": 1000,
        "user2": 0,
        "user3": 0
      }
    },
    "memberIds": ["user1", "user2", "user3"],
    "groupName": "Roommates"
  }
}
```

### 6. Settlement Suggestions

**GET** `/api/analytics/simplify?groupId=123`

Returns optimal settlement suggestions to minimize cash transfers.

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "from": "user2",
        "to": "user1",
        "amountCents": 1000,
        "description": "Settlement from user2 to user1"
      }
    ],
    "groupName": "Roommates"
  }
}
```

### 7. Aging Buckets

**GET** `/api/analytics/aging`

Returns unsettled expenses categorized by age.

**Response:**
```json
{
  "success": true,
  "data": {
    "0-7": { "count": 5, "amountCents": 15000 },
    "8-30": { "count": 3, "amountCents": 8000 },
    "31-60": { "count": 1, "amountCents": 2500 },
    "60+": { "count": 0, "amountCents": 0 }
  },
  "baseCurrency": "USD"
}
```

### 8. Ledger Export

**GET** `/api/analytics/ledger`

Returns paginated list of expenses matching filters.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "expense123",
        "description": "Dinner",
        "amountCents": 5000,
        "amountBaseCents": 5000,
        "currency": "USD",
        "category": "food",
        "date": "2024-01-01T00:00:00.000Z",
        "status": "active",
        "type": "group",
        "groupName": "Roommates",
        "paidBy": "John Doe",
        "participantCount": 3,
        "isSettled": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25,
      "totalPages": 1
    },
    "baseCurrency": "USD"
  }
}
```

### 9. CSV Export

**GET** `/api/analytics/export/csv`

Returns CSV file with filtered expense data.

**Response:** CSV file download

### 10. Group Health

**GET** `/api/analytics/group-health?groupId=123`

Returns group health metrics (requires group membership).

**Response:**
```json
{
  "success": true,
  "data": {
    "activeMembers30d": 4,
    "activeMembers90d": 4,
    "totalMembers": 4,
    "weeklyExpenses": 3,
    "settlementRate": 85,
    "fastSettlementRate": 70,
    "groupName": "Roommates"
  }
}
```

## Multi-Currency Support

### Base Currency Logic

1. **User Preference**: Defaults to `user.preferences.baseCurrency` or "USD"
2. **Transaction Storage**: Each expense stores `fxRate` at transaction time
3. **Conversion**: `amountBaseCents = round(amountCents * fxRate)`
4. **Fallback**: If `fxRate` missing, defaults to 1.0

### Currency Fields

- `currencyCode`: Transaction currency (e.g., "EUR", "JPY")
- `fxRate`: Exchange rate to base currency at transaction time
- `amountCents`: Amount in transaction currency
- `amountBaseCents`: Amount in base currency (calculated)

## ACL Enforcement

### Personal Expenses
- User can only access their own personal expenses
- Filtered by `paidBy` or `splits.user` matching current user

### Group Expenses
- User must be member of group to access analytics
- Verified via `Group.members` array
- Group membership checked before any data access

### Admin Access
- Group admins have full access to group analytics
- Regular members see only their own data within groups

## Performance Optimizations

### Database Indexes
```javascript
// Expense model indexes
expenseSchema.index({ groupId: 1, date: -1 })
expenseSchema.index({ paidBy: 1, date: -1 })
expenseSchema.index({ "splits.user": 1, date: -1 })
expenseSchema.index({ category: 1, date: -1 })
expenseSchema.index({ status: 1, date: -1 })
```

### Query Optimization
- Use `.lean()` for read-only queries
- Field projection to minimize data transfer
- Aggregation pipelines for complex calculations
- Proper `$match` stages early in pipeline

### Caching
- React Query with 5-minute stale time
- Query key includes all filter parameters
- Automatic background refetching

## Frontend Implementation

### Filter System
- Mode toggle (Personal/Group/All)
- Time range presets + custom dates
- Category, payment method, currency filters
- Status and user filters
- URL query parameter persistence

### Chart Components
- Placeholder implementations ready for chart libraries
- Responsive design with proper loading states
- Error boundaries and empty state handling

### Data Flow
1. User adjusts filters
2. React Query fetches new data
3. Components re-render with new data
4. Loading states shown during fetches
5. Error handling for failed requests

## Testing

### Unit Tests
- Analytics calculations module fully tested
- Edge cases and error conditions covered
- Rounding invariants verified
- 27 test cases passing

### Test Coverage
- `toBaseCurrency`: Input validation, edge cases
- Split calculations: Equal, weighted, percentage
- Balance calculations: Member balances, matrices
- Settlement algorithms: Greedy optimization
- Aging and velocity: Time-based calculations
- Fairness metrics: Participation and equity

## Future Enhancements

### Planned Features
1. **Advanced Charts**: Recharts/Chart.js integration
2. **Real-time Updates**: WebSocket integration
3. **Export Formats**: Excel, PDF support
4. **Custom Dashboards**: User-configurable layouts
5. **Predictive Analytics**: ML-based spending insights

### Performance Improvements
1. **Database Sharding**: For large datasets
2. **Redis Caching**: For frequently accessed data
3. **Background Jobs**: For heavy calculations
4. **CDN Integration**: For static assets

## Troubleshooting

### Common Issues

1. **Permission Denied (403)**
   - Verify user is member of requested group
   - Check JWT token validity
   - Ensure proper group membership

2. **No Data Returned**
   - Check filter parameters
   - Verify date ranges are valid
   - Ensure expenses exist for user/groups

3. **Currency Conversion Errors**
   - Verify `fxRate` values in database
   - Check base currency preferences
   - Validate currency code formats

### Debug Mode
Enable debug logging in backend:
```javascript


```

## Support

For technical support or feature requests:
1. Check existing documentation
2. Review test cases for examples
3. Examine API response formats
4. Verify ACL and permission settings
