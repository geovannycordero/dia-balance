## **v0.dev Prompt: Diabetes Management Diary Application**

Create a mobile-first, responsive web application for diabetes management that allows users to track their health metrics, medications, food, exercise, and sleep.

### **Core Features:**

#### **1. Authentication System**

- Email-based authentication where users receive a one-time code via email
- Pre-approved emails stored in database (basic user info only)
- Simple login flow: enter email → receive code → enter code → access app

#### **2. Main Tracking Page (Dashboard)**

- **Action Logger**: Floating action button that opens a modal/form to log new actions
- **Action Types** (with specific fields for each):
  - **Food Intake**: Type (breakfast, lunch, dinner, snack, other), Description, time (default: now), optional notes
  - **Insulin Dosage**: Type (dropdown: Simple, NPH, Glargina, other + custom input), units, time, optional notes
  - **Medication**: Name, dosage, time, optional notes
  - **Blood Glucose**: Reading (mg/dL), time, context (fasting, pre-meal, post-meal, bedtime)
  - **Exercise**: Type (cardio, strength, flexibility, other), duration (minutes), intensity (1-5), time, notes
  - **Sleep**: Hours slept, quality rating (1-5), time period (night of)
  - **Symptoms/Feelings**: Description, severity (1-10), time, notes
  - **Weight**: Value (kg), time
  - **Hydration**: Amount (cups/ml), time
- **Recent Actions Feed**: Chronological list (newest first) showing all logged actions
- Each entry shows: icon, type, details, timestamp, and edit/delete buttons
- Real-time updates when adding/editing/deleting actions

#### **3. Analytics & Insights Page**

- **Filter Panel**: Date range (day/week/month), action types, custom date ranges
- **Visualizations**:
  - **Blood Glucose Trends**: Line chart showing daily/weekly patterns
  - **Correlation Charts**:
    - Insulin vs. Blood Glucose over time
    - Exercise impact on glucose levels
    - Food intake patterns with glucose responses
    - All together
  - **Medication Adherence**: Calendar view showing consistency
  - **Sleep Quality Trends**: Bar chart with glucose correlation
  - **Weight Progress**: Line chart over time
  - **Hydration Tracking**: Daily/weekly totals
- **Predictive Insights** (based on patterns):
  - "Your glucose tends to be higher after [specific food]"
  - "Best glucose readings occur after [amount] of exercise"
  - "Optimal insulin timing appears to be [pattern]"
- **Export Options**: Download filtered data as CSV/PDF

#### **4. UI/UX Requirements**

- Mobile-responsive design (touch-friendly)
- Color-coded action types for quick recognition
- Quick-add buttons for frequent actions
- Dark mode support for low-light viewing
- Accessible design (WCAG compliant)
- Offline capability with sync when online

#### **5. Database Schema (PostgreSQL with Prisma)**

This schema can be modified based on the prisma/postgres requirements for authentication and other things.

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  isVerified    Boolean   @default(false)
  actions       Action[]
  preferences   Json?     // User preferences for units, etc.
}

model Action {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  type          ActionType
  timestamp     DateTime  @default(now())

  // Common fields
  notes         String?

  // Type-specific fields (nullable, used based on type)
  bloodGlucose  Float?    // in preferred unit
  glucoseContext String?  // fasting, pre-meal, etc.

  insulinType   String?   // rapid, long, mixed, custom
  insulinUnits  Float?

  medicationName String?
  medicationDose String?

  foodDescription String?

  exerciseType  String?   // cardio, strength, etc.
  exerciseDuration Int?   // minutes
  exerciseIntensity String?

  sleepHours    Float?
  sleepQuality  Int?      // 1-5 scale

  symptomDesc   String?
  symptomSeverity Int?    // 1-10

  weightValue   Float?
  weightUnit    String?   // kg or lb

  hydrationAmount Float?  // in preferred unit

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId, timestamp])
  @@index([userId, type])
}

enum ActionType {
  BLOOD_GLUCOSE
  INSULIN
  MEDICATION
  FOOD
  EXERCISE
  SLEEP
  SYMPTOMS
  WEIGHT
  HYDRATION
}
```

#### **6. Technical Stack**

- Next.js
- React with TypeScript
- Tailwind CSS for styling
- Prisma ORM with PostgreSQL
- Recharts or Chart.js for visualizations
- Resend for email (code sending)
- Vercel hosting (or similar)

#### **7. Key Considerations**

- Timezone handling for time-sensitive data
- Data validation for all inputs
- Undo/redo capabilities for accidental deletions
- Data privacy indicators (encryption at rest)
- Backup/restore functionality
- Shareable reports (PDF generation)

---

### **Recommended Visualizations for Diabetes Management:**

1. **Glucose Time-in-Range Chart**: Shows % of readings in target range
2. **Insulin Stacking Visualization**: Prevents overlapping insulin effects
3. **Pattern Recognition**: Weekly patterns highlighting recurring highs/lows
4. **Medication Timeline**: Visual schedule of all medications
5. **Correlation Matrix**: How different factors affect glucose levels

### **Instructions for development:**

- Start with the authentication flow
- Build the main dashboard with action logging
- Implement the analytics page with interactive filters
- Use a clean, medical-grade color scheme (blues, greens, neutral tones)
- Ensure all interactive elements are touch-friendly for mobile
- Include loading states and error handling
- Optimize for performance on mobile networks
