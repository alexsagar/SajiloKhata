# Currency Selection Feature

## Overview

The Splitwise application now includes comprehensive currency selection capabilities that allow users to manage expenses in their preferred currencies, both for personal expenses and group expenses.

## Features

### 1. Currency Selection UI

#### Personal Expenses
- Users can select their preferred currency before creating personal expenses
- Currency selection is prompted before amount entry
- Defaults to user's profile currency preference
- Supports 40+ international currencies with flags and symbols

#### Group Expenses
- Currency selection when creating group expenses
- Automatically defaults to the group's currency
- Users can override with a different currency if needed
- Clear indication when group currency differs from personal preference

#### Group Creation
- Currency selection during group creation
- Comprehensive currency picker with search and categorization
- Shows popular currencies first for quick selection

### 2. Currency Persistence

#### User Profile
- Currency preference stored in user profile
- Used as default for personal expenses
- Can be updated anytime from account settings
- Persists across sessions and devices

#### Group Settings
- Each group has its own currency setting
- All expenses in a group display in the group's currency
- Independent of individual member preferences

### 3. Display & Formatting

#### Currency Display Components
- `CurrencyDisplay`: Main component for showing amounts with proper formatting
- `CurrencyBadge`: Compact currency indicator with symbol and code
- `CurrencySelector`: Comprehensive currency picker with search
- `CurrencyComparison`: Shows amounts in multiple currencies

#### Formatting Features
- Proper decimal places for each currency (e.g., JPY has 0, USD has 2)
- International number formatting based on locale
- Currency symbols and codes displayed appropriately
- Compact formatting for large amounts (K, M notation)

## Technical Implementation

### Backend Models

#### User Model
```javascript
preferences: {
  currency: {
    type: String,
    default: "USD",
  },
  // ... other preferences
}
```

#### Group Model
```javascript
currency: {
  type: String,
  default: "USD",
}
```

#### Expense Model
```javascript
currency: {
  type: String,
  default: "USD",
}
```

### Frontend Components

#### Core Components
- `ExpenseCreationOptions`: Main entry point for expense creation
- `CreateExpenseDialog`: Group expense creation with currency selection
- `CreatePersonalExpenseDialog`: Personal expense creation with currency selection
- `CreateGroupDialog`: Group creation with currency selection
- `PreferenceSettings`: User currency preference management

#### Currency Components
- `CurrencySelector`: Main currency picker component
- `CurrencyDisplay`: Amount display with currency formatting
- `CurrencyBadge`: Currency indicator badge
- `CurrencyComparison`: Multi-currency comparison display

### Currency Data

#### Supported Currencies
The system supports 40+ currencies including:

**Popular Currencies:**
- USD ($) - US Dollar
- EUR (€) - Euro
- GBP (£) - British Pound
- JPY (¥) - Japanese Yen
- CAD (C$) - Canadian Dollar
- AUD (A$) - Australian Dollar
- CHF (CHF) - Swiss Franc
- CNY (¥) - Chinese Yuan

**Asian Currencies:**
- INR (₹) - Indian Rupee
- NPR (रू) - Nepali Rupee
- KRW (₩) - South Korean Won
- SGD (S$) - Singapore Dollar
- HKD (HK$) - Hong Kong Dollar
- THB (฿) - Thai Baht
- MYR (RM) - Malaysian Ringgit
- IDR (Rp) - Indonesian Rupiah
- PHP (₱) - Philippine Peso
- VND (₫) - Vietnamese Dong

**European Currencies:**
- SEK (kr) - Swedish Krona
- NOK (kr) - Norwegian Krone
- DKK (kr) - Danish Krone
- PLN (zł) - Polish Złoty
- CZK (Kč) - Czech Koruna
- HUF (Ft) - Hungarian Forint
- RUB (₽) - Russian Ruble

**Other Regions:**
- BRL (R$) - Brazilian Real
- MXN ($) - Mexican Peso
- ARS ($) - Argentine Peso
- ZAR (R) - South African Rand
- NZD (NZ$) - New Zealand Dollar

## User Experience Flow

### 1. Personal Expense Creation
```
User clicks "Add Personal Expense"
↓
Currency selection prompt appears
↓
User selects currency (defaults to profile preference)
↓
User enters expense details
↓
Expense saved with selected currency
```

### 2. Group Expense Creation
```
User clicks "Add Group Expense"
↓
Group selection (currency auto-filled from group)
↓
User can override currency if needed
↓
User enters expense details
↓
Expense saved with group currency
```

### 3. Group Creation
```
User clicks "Create Group"
↓
Group details form with currency selector
↓
User selects group currency
↓
Group created with selected currency
```

### 4. Currency Preference Update
```
User goes to Settings > Preferences
↓
Currency selector shows current preference
↓
User selects new currency
↓
Preference saved and applied to new expenses
```

## Currency Display Examples

### Personal Expenses (User preference: NPR)
- Amount: ₨1,500.00
- Currency Badge: रू NPR

### Group Expenses (Group currency: INR)
- Amount: ₹2,000.00
- Currency Badge: ₹ INR
- Note: "Group uses INR"

### Mixed Currency Display
- Personal: ₨1,500.00 (NPR)
- Group: ₹2,000.00 (INR)
- Comparison: ₨1,500.00 ≈ ₹2,000.00 (1 NPR = 1.33 INR)

## Configuration Options

### Currency Selector Variants
- `default`: Standard dropdown with search
- `compact`: Minimal display for forms
- `detailed`: Full display with flags and descriptions

### Display Options
- `showSymbol`: Display currency symbol (₨, ₹, $)
- `showCode`: Display currency code (NPR, INR, USD)
- `compact`: Use compact notation (K, M for thousands/millions)
- `locale`: International number formatting

### Formatting Variants
- `default`: Standard text size
- `large`: Large display for amounts
- `small`: Small text for labels
- `mono`: Monospace font for numbers

## Future Enhancements

### Planned Features
1. **Real-time Exchange Rates**: Integration with currency APIs
2. **Multi-currency Balances**: Show balances in multiple currencies
3. **Currency Conversion**: Automatic conversion between currencies
4. **Regional Preferences**: Auto-detect user's location and suggest currency
5. **Historical Rates**: Track currency changes over time

### API Integration
- Exchange rate providers (Fixer.io, CurrencyLayer, etc.)
- Real-time rate updates
- Historical rate data
- Currency conversion calculations

## Best Practices

### For Users
1. Set your personal currency preference in settings
2. Choose appropriate group currencies for international trips
3. Be consistent with currency usage within groups
4. Use the currency selector to explore different options

### For Developers
1. Always use the currency components for display
2. Store amounts with their associated currency
3. Handle currency validation in forms
4. Provide fallbacks for unsupported currencies
5. Use the currency utility functions for formatting

## Troubleshooting

### Common Issues
1. **Currency not displaying**: Check if currency code is supported
2. **Formatting errors**: Ensure proper decimal places for currency
3. **Symbol not showing**: Verify currency data includes symbol
4. **Preference not saving**: Check user authentication and API calls

### Debug Information
- Currency codes are case-sensitive
- All currencies must have valid ISO 4217 codes
- Decimal places are currency-specific
- Fallback formatting available for unsupported currencies

## API Endpoints

### User Preferences
- `PUT /api/users/preferences` - Update user currency preference

### Groups
- `POST /api/groups` - Create group with currency
- `PUT /api/groups/:id` - Update group currency

### Expenses
- `POST /api/expenses` - Create expense with currency
- `PUT /api/expenses/:id` - Update expense currency

## Testing

### Test Cases
1. Currency selection in expense creation
2. Currency persistence in user preferences
3. Group currency inheritance
4. Currency display formatting
5. Currency validation
6. Multi-currency expense handling

### Test Data
- Multiple currency types
- Various amount ranges
- Different decimal place requirements
- International number formats
- Currency symbol variations
