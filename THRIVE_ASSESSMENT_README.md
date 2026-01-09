# Thrive Leadership Assessment Platform

A comprehensive AI-powered leadership assessment platform that evaluates users across 12 leadership principles organized into 4 dimensions. The platform uses adaptive AI questioning to personalize the assessment experience and generate detailed leadership evaluations.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Edge Functions (Backend)](#edge-functions-backend)
6. [Frontend Components](#frontend-components)
7. [Assessment Flow](#assessment-flow)
8. [Leadership Framework](#leadership-framework)
9. [Security](#security)
10. [Non-Technical Summary](#non-technical-summary)

---

## Overview

The Thrive Leadership Assessment is an interactive tool designed to evaluate leadership capabilities through a conversational AI-driven assessment. Users answer a series of questions (multiple-choice, scale-based, open-ended, and most/least choice) that adapt based on their responses and profile.

### Key Features

- **Adaptive AI Questioning**: Questions are generated dynamically based on user responses and detected leadership style
- **4 Leadership Style Paths**: Users are routed to specialized questions based on their detected leadership approach
- **12 Leadership Principles**: Comprehensive coverage of leadership competencies
- **4 Aggregate Dimensions**: High-level scoring across Self-Leadership, Relational Leadership, Organizational Leadership, and Leadership Beyond Organization
- **AI-Powered Evaluation**: OpenAI GPT-4 analyzes responses to generate personalized scores and insights
- **Tolerant Scoring System**: 5-level scoring from "Emerging" (30-40) to "Thriving" (90+)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Vite)                        │
├─────────────────────────────────────────────────────────────────────┤
│  Pages:                                                              │
│  - Home.tsx          → Landing page                                  │
│  - Auth.tsx          → Login/Signup                                  │
│  - Assessment.tsx    → Main assessment interface                     │
│  - Evaluation.tsx    → Results dashboard                             │
│  - Model.tsx         → Leadership framework info                     │
│  - About.tsx         → About page                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Hooks:                                                              │
│  - useAuth.ts        → Authentication state management               │
│  - useConversation.ts→ Conversation/thread management                │
│  - useGPT5Chat.ts    → AI chat interaction                           │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    │ Supabase Client SDK
                                    │ (Authentication + Edge Functions)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SUPABASE (Backend)                             │
├─────────────────────────────────────────────────────────────────────┤
│  Edge Functions:                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ dynamic-question-generator                                       ││
│  │ → Generates adaptive AI-powered questions based on:             ││
│  │   - User profile (role, team size, industry)                    ││
│  │   - Previous responses and patterns                              ││
│  │   - Detected leadership style                                    ││
│  │   - Principle coverage gaps                                      ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ai-evaluation                                                    ││
│  │ → Analyzes all responses to generate:                           ││
│  │   - 12 principle scores (30-100 scale)                          ││
│  │   - 4 dimension aggregate scores                                 ││
│  │   - Leadership persona identification                            ││
│  │   - Personalized insights and recommendations                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ chat-assistant                                                   ││
│  │ → Manages OpenAI thread creation and conversation state         ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ gpt5-chat                                                        ││
│  │ → General-purpose AI chat for follow-up conversations           ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  Database Tables:                                                    │
│  - profiles          → User profiles with thread_id                  │
│  - conversations     → Assessment sessions                           │
│  - messages          → All Q&A messages with metadata                │
│  - evaluations       → Final evaluation results                      │
│  - response_memories → Response analysis data                        │
├─────────────────────────────────────────────────────────────────────┤
│  Authentication:                                                     │
│  - Email/Password signup and login                                   │
│  - JWT-based session management                                      │
│  - Row Level Security (RLS) on all tables                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS API Calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         OPENAI API                                   │
│  - GPT-4/GPT-4o for question generation                             │
│  - GPT-4 for response evaluation and scoring                        │
│  - Thread/Assistant API for conversation management                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool and dev server |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | UI component library |
| **React Router** | Navigation |
| **TanStack Query** | Data fetching and caching |

### Backend (Supabase)
| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend-as-a-Service |
| **PostgreSQL** | Database |
| **Supabase Auth** | Authentication |
| **Edge Functions (Deno)** | Serverless backend logic |
| **Row Level Security** | Data access control |

### External Services
| Service | Purpose |
|---------|---------|
| **OpenAI API** | AI question generation and evaluation |

---

## Database Schema

### Tables

#### `profiles`
Stores user profile information.
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| email | TEXT | User email |
| full_name | TEXT | User's full name |
| thread_id | TEXT | OpenAI thread ID for conversation continuity |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |

#### `conversations`
Tracks assessment sessions.
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who owns this conversation |
| thread_id | TEXT | Associated OpenAI thread |
| assistant_id | TEXT | OpenAI assistant ID |
| status | TEXT | Current status |
| current_stage | TEXT | Assessment progress stage |
| assessment_complete | BOOLEAN | Whether assessment is finished |
| started_at | TIMESTAMP | Session start time |
| completed_at | TIMESTAMP | Session completion time |
| baseline_scores | JSON | Initial scoring data |
| persona_snapshot | JSON | Detected leadership persona |
| principle_coverage | JSON | Coverage across 12 principles |

#### `messages`
Stores all questions and answers.
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Parent conversation |
| user_id | UUID | Message owner |
| message_type | TEXT | 'bot' or 'user' |
| content | TEXT | Message content |
| question_type | TEXT | 'multiple-choice', 'open-ended', 'scale', 'most-least-choice' |
| question_options | JSON | MCQ options if applicable |
| question_scale_min/max | INTEGER | Scale range if applicable |
| principle_focus | TEXT | Which principle this question assesses |
| assessment_stage | TEXT | Current assessment phase |
| generated_by_ai | BOOLEAN | Whether AI generated this question |
| created_at | TIMESTAMP | Message timestamp |

#### `evaluations`
Stores final assessment results.
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who owns this evaluation |
| conversation_id | UUID | Source conversation |
| data | JSON | Complete evaluation data (frameworks, principles, persona) |
| summary | TEXT | Text summary |
| created_at | TIMESTAMP | Evaluation generation time |

#### `response_memories`
Stores analyzed response patterns.
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Parent conversation |
| message_id | UUID | Source message |
| user_id | UUID | User owner |
| principle | TEXT | Related leadership principle |
| response_text | TEXT | Original response |
| insights | JSON | AI-extracted insights |
| patterns | JSON | Detected response patterns |
| sentiment | JSON | Sentiment analysis |
| quality_metrics | JSON | Response quality scores |
| follow_up_needed | BOOLEAN | Whether follow-up is recommended |

---

## Edge Functions (Backend)

### 1. `dynamic-question-generator`
**Purpose**: Generates the next assessment question dynamically.

**Flow**:
1. Receives user profile and conversation history
2. Analyzes response patterns and detected leadership style
3. Identifies gaps in principle coverage
4. Generates contextually appropriate question via OpenAI
5. Returns question with type, options, and metadata

**Key Features**:
- Detects 1 of 4 leadership styles from initial responses
- Routes to style-specific challenge questions
- Ensures all 12 principles are covered
- Adapts question type based on user engagement
- Prevents duplicate questions

### 2. `ai-evaluation`
**Purpose**: Analyzes completed assessments and generates scores.

**Flow**:
1. Receives all user responses and conversation context
2. Groups responses by principle and dimension
3. Sends to OpenAI with detailed scoring rubric
4. Calculates scores for 12 principles (30-100 scale)
5. Aggregates into 4 dimension scores
6. Identifies leadership persona
7. Returns complete evaluation data

**Scoring Levels**:
| Level | Score Range | Description |
|-------|-------------|-------------|
| Emerging | 30-40 | Beginning to develop this capability |
| Developing | 40-50 | Growing but needs more experience |
| Expanding | 50-70 | Solid foundation with room to grow |
| Flourishing | 70-90 | Strong capability, ready to mentor |
| Thriving | 90+ | Exceptional mastery |

### 3. `chat-assistant`
**Purpose**: Manages OpenAI conversation threads.

**Actions**:
- `create_thread`: Creates new OpenAI thread for user
- Thread ID is stored in user profile for continuity

### 4. `gpt5-chat`
**Purpose**: General-purpose AI chat functionality.

---

## Frontend Components

### Pages

#### `Assessment.tsx`
The main assessment interface. Handles:
- Pre-assessment intro form (role, team size, industry, etc.)
- Message display and scrolling
- Multiple input types:
  - Multiple choice buttons
  - Slider for scale questions
  - Textarea for open-ended responses
  - Most/Least choice interface
- Progress tracking
- Assessment completion and navigation to results

#### `Evaluation.tsx`
Displays assessment results. Features:
- 4 leadership dimension cards with scores
- Level indicators (Emerging → Thriving)
- Progress bars with level bracket markers
- Growth opportunities section
- Top priorities recommendations
- Coaching call CTA

### Key Hooks

#### `useAuth.ts`
Manages authentication state:
- Listens to Supabase auth changes
- Provides `signUp`, `signIn`, `signOut` functions
- Creates OpenAI thread on signup

#### `useConversation.ts`
Manages conversation state:
- Creates/retrieves conversation records
- Saves messages to database
- Marks conversations complete
- Fetches user's thread ID

---

## Assessment Flow

```
┌──────────────────┐
│   User Signup    │
│   (Auth.tsx)     │
└────────┬─────────┘
         │ Creates profile + OpenAI thread
         ▼
┌──────────────────┐
│  Start Assessment│
│  (Assessment.tsx)│
└────────┬─────────┘
         │ User fills intro form
         ▼
┌──────────────────┐
│  Pre-Assessment  │
│  Info Collection │
│  - Position      │
│  - Team size     │
│  - Industry      │
│  - Experience    │
│  - Challenges    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Questions 1-4   │◄────────────────────────────────┐
│  Style Detection │                                  │
│  (MCQ format)    │                                  │
└────────┬─────────┘                                  │
         │ Analyze responses                          │
         ▼                                            │
┌──────────────────┐                                  │
│  Detect Style    │                                  │
│  1 of 4 paths:   │                                  │
│  - Analytical    │                                  │
│  - Action        │                                  │
│  - Collaborative │                                  │
│  - Visionary     │                                  │
└────────┬─────────┘                                  │
         │                                            │
         ▼                                            │
┌──────────────────┐                                  │
│  AI-Generated    │                                  │
│  Questions 5-26  │──────────────────────────────────┤
│  (Adaptive)      │   Loop until minimum questions   │
└────────┬─────────┘   and principle coverage met     │
         │                                            │
         ▼                                            │
┌──────────────────┐                                  │
│  Check Coverage  │──── Not complete ────────────────┘
│  12 principles   │
│  26+ questions   │
└────────┬─────────┘
         │ Complete
         ▼
┌──────────────────┐
│  Wrap-up Phase   │
│  Final questions │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AI Evaluation   │
│  (Edge Function) │
└────────┬─────────┘
         │ Analyze all responses
         ▼
┌──────────────────┐
│  Generate Scores │
│  12 principles   │
│  4 dimensions    │
│  Leadership      │
│  persona         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Save Evaluation │
│  to Database     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Display Results │
│  (Evaluation.tsx)│
└──────────────────┘
```

---

## Leadership Framework

### 4 Dimensions (Aggregated Scores)

| Dimension | Description |
|-----------|-------------|
| **Self-Leadership** | Personal awareness, responsibility, and continuous growth |
| **Relational Leadership** | Building trust, empathy, and empowering others |
| **Organizational Leadership** | Vision, culture, and managing productive tension |
| **Leadership Beyond Organization** | Stakeholder impact, innovation, and ethical stewardship |

### 12 Principles

| Dimension | Principle | Description |
|-----------|-----------|-------------|
| Self-Leadership | Self-Awareness | Understanding your strengths, weaknesses, and impact |
| Self-Leadership | Self-Responsibility | Taking ownership of actions and outcomes |
| Self-Leadership | Continuous Personal Growth | Commitment to ongoing learning and development |
| Relational | Trust & Psychological Safety | Creating environments where people feel safe |
| Relational | Empathy & Awareness of Others | Understanding and responding to others' needs |
| Relational | Empowered & Shared Responsibility | Delegating authority and accountability |
| Organizational | Purpose, Vision & Aligned Outcome | Setting and communicating strategic direction |
| Organizational | Culture of Leadership | Building leadership capacity throughout the organization |
| Organizational | Harnessing Tensions | Using conflict productively for better outcomes |
| Beyond Org | Positive Impact on Stakeholders | Considering broader stakeholder needs |
| Beyond Org | Embracing Change & Innovation | Driving and adapting to change |
| Beyond Org | Social & Ethical Stewardship | Leading with integrity and social responsibility |

### 4 Leadership Style Paths

Based on responses to initial detection questions, users are routed to one of four paths:

| Style | Strengths | Growth Focus |
|-------|-----------|--------------|
| **Analytical-Reflective** | Thoughtful, data-driven, thorough | Taking faster action, embracing uncertainty |
| **Action-Oriented** | Decisive, results-focused, quick | Slowing down for collaboration, reflection |
| **Collaborative-Relational** | Team-focused, consensus-building | Making tough independent decisions |
| **Vision-Strategic** | Big-picture thinking, inspiring | Execution details, tactical implementation |

---

## Security

### Authentication
- Email/password authentication via Supabase Auth
- JWT tokens for session management
- Token passed to edge functions for user identification

### Database Security
- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Policies enforce `user_id` matching on all operations

### Edge Function Security
- All edge functions require valid JWT (`verify_jwt = true`)
- Server-side validation of auth headers
- User ID extracted from validated token

### API Keys
- OpenAI API key stored as Supabase secret
- Never exposed to frontend
- Only accessed in edge functions

---

## Non-Technical Summary

### What is this?

The Thrive Leadership Assessment is an online tool that helps leaders understand their leadership strengths and areas for growth. Think of it like a personalized leadership coach that asks you thoughtful questions and gives you a detailed report on your leadership style.

### How does it work?

1. **You sign up** with your email and password
2. **You answer questions** about your role, team, and challenges
3. **The AI asks personalized questions** - these adapt based on your answers
4. **You complete about 26 questions** mixing:
   - Multiple choice (pick an option)
   - Rating scales (1-10)
   - Open-ended (write your thoughts)
   - Ranking (what you do most/least)
5. **AI analyzes your responses** and creates your leadership profile
6. **You receive your results** showing:
   - Scores in 4 main areas
   - Your leadership style type
   - Specific growth opportunities
   - Recommendations for improvement

### What does it measure?

The assessment looks at 4 main areas of leadership:

1. **Self-Leadership** - How well you know yourself and take responsibility
2. **Relational Leadership** - How you build trust and connect with others
3. **Organizational Leadership** - How you set direction and build culture
4. **Leadership Beyond** - How you impact the broader world

### What are the score levels?

Your scores are translated into 5 levels:

| Level | What it means |
|-------|--------------|
| 🌱 **Emerging** (30-40) | You're starting to develop this skill |
| 🌿 **Developing** (40-50) | You're growing but need more practice |
| 🌳 **Expanding** (50-70) | You have solid skills with room to grow |
| 🌲 **Flourishing** (70-90) | You're strong here and can help others |
| 🏆 **Thriving** (90+) | You've mastered this area |

### Is my data safe?

Yes! Your responses are:
- Protected by secure login
- Only visible to you
- Never shared with others
- Stored in encrypted databases

### How long does it take?

The assessment typically takes **15-25 minutes** depending on how detailed your responses are.

### What happens after?

After completing the assessment, you'll see:
- Your personalized results dashboard
- Your leadership style identification
- Top priorities for development
- Option to book a coaching call for deeper guidance

---

## Getting Started (For Developers)

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

The project uses Supabase environment variables that are automatically configured:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

Edge functions use:
- `OPENAI_API_KEY` - For AI question generation and evaluation
- `SUPABASE_URL` - Internal Supabase URL
- `SUPABASE_ANON_KEY` - Internal Supabase key

---

## License

Proprietary - Thrive Leadership Assessment Platform
