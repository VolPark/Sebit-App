# 🏗️ White-Label Management System (Horyna / SEBIT)

![Project Status](https://img.shields.io/badge/Status-Active_Development-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15.0-black)
![React](https://img.shields.io/badge/React-19.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E)

**Comprehensive internal management system designed for multi-client deployment.** 
One codebase powers customized applications for **Interiéry Horyna** and **SEBIT Solutions**, featuring client management, offer generation, financial tracking, and granular feature modularity.

---

## 🎨 White-Labeling Architecture
This project uses a **"Single Codebase, Multiple Deployments"** strategy.
- **Source Code**: Shared across all clients in a single GitHub repository.
- **Deployments (Vercel)**: Separate deployments for each client, configured via **Environment Variables**.
- **Databases (Supabase)**: Separate isolated databases per client.

### ⚙️ Configuration & Features (Feature Flags)
The application behavior and branding are fully controlled by environment variables. You can:
- Change **Company Identity** (Name, Logo, Address).
- Customize **Brand Colors** (Primary, Accent, Text).
- Toggle **Modules & Features** (Dashboard, Finance, Admin) down to specific sub-menus.

---

## 🔧 Environment Variables Reference

When setting up a new Vercel project (e.g., for SEBIT), configure these variables.

### 1. Identity & Contact
| Variable | Description | Example (SEBIT) |
|---|---|---|
| `NEXT_PUBLIC_COMPANY_NAME` | Main App Title | "SEBIT Solutions" |
| `NEXT_PUBLIC_COMPANY_SHORT_NAME` | Prefix for files | "SEBIT" |
| `NEXT_PUBLIC_LOGO_URL` | Sidebar/Dark Logo | `/brands/sebit/sebit_solutions_dark.png` |
| `NEXT_PUBLIC_LOGO_LIGHT_URL` | PDF/Light Logo | `/brands/sebit/sebit_solutions_light.png` |
| `NEXT_PUBLIC_FAVICON` | Browser Icon | `/brands/sebit/favion_arrow.png` |
| `NEXT_PUBLIC_COMPANY_WEB` | Website | "www.sebit.cz" |
| `...ADDRESS/EMAIL/ICO/DIC` | [Full list in `lib/companyConfig.ts`] | |

### 2. Branding Colors
Default is Horyna Red (`#E30613`). Override for clients:
```env
NEXT_PUBLIC_BRAND_PRIMARY="#C6FF00"         # Main Action (e.g. Lime)
NEXT_PUBLIC_BRAND_PRIMARY_FOREGROUND="#002B5C" # Text on Primary (e.g. Navy)
NEXT_PUBLIC_BRAND_ACCENT="#002B5C"          # Secondary/Highlights
NEXT_PUBLIC_PDF_THEME_COLOR="#002B5C"       # PDF Header/Footer Color
```

### 3. Feature Flags (Modularization)
Control which sections of the app are visible. Defaults to `true` if omitted.

**Group Level:**
```env
NEXT_PUBLIC_ENABLE_DASHBOARD="true"
NEXT_PUBLIC_ENABLE_OFFERS="true"
NEXT_PUBLIC_ENABLE_ADMIN="true"
NEXT_PUBLIC_ENABLE_FINANCE="true"
NEXT_PUBLIC_ENABLE_AI="true"
```

**Granular Level (Sub-menus):**
```env
# Dashboard
NEXT_PUBLIC_ENABLE_DASHBOARD_FIRMA="true"
NEXT_PUBLIC_ENABLE_DASHBOARD_WORKERS="true"
...
# Finance
NEXT_PUBLIC_ENABLE_FINANCE_REPORTS="true" # Výkazy
NEXT_PUBLIC_ENABLE_FINANCE_PAYROLL="true" # Mzdy
NEXT_PUBLIC_ENABLE_FINANCE_COSTS="true"   # Náklady
```

---

## 🚀 Deployment Guide (Vercel)

### Deploying for SEBIT Solutions:
1.  **Create Project**: Import this repo into Vercel.
2.  **Branch Configuration**:
    *   Go to **Settings > Domains**.
    *   Edit your domain (e.g., `sebit.vercel.app`).
    *   Set **Git Branch** to `sebit`.
3.  **Environment Variables**: Copy/Paste the variables from `walkthrough.md` or this README section above.
4.  **Database**: Connect to the SEBIT specific Supabase project.

### Deploying for Interiéry Horyna:
1.  **Branch**: Use `main`.
2.  **Environment Variables**: Not required (defaults apply), but recommended for explicit configuration.

---

## ✨ Key Features

### 📊 Dashboard
- **Real-time Analytics**: Visual overview of company performance.
- **Financial Metrics**: Track turnover, profit, and costs (fixed vs. variable).
- **Interactive Charts**: Dynamic data visualization for monthly performance.

### 💰 Offers (Nabídky)
- **Create & Manage**: Create price offers for clients.
- **Itemized Lists**: Add items, services, and custom descriptions using a "shopping cart" style interface.
- **PDF Generation**: Automatically generate professional PDF offers including images.
- **Validity Tracking**: Set and track offer validity dates (default 30 days).

### 👥 Client Management (Klienti)
- **Centralized Database**: Store and manage all client contact details and billing information.
- **Action Tracking**: Link specific projects and actions to individual clients.

### 👷 Workforce Management (Pracovníci & Mzdy)
- **Employee Profiles**: Manage team members, roles, and hourly rates.
- **Automated Payroll**: Calculates salaries based on logged hours (reports) and set hourly rates.
- **Shift Tracking**: Monitor work distribution across different projects.

### 📝 Reporting & Time Tracking (Výkazy)
- **Daily Reports**: Employees satisfy reporting requirements for tracked hours on specific dates.
- **Project Association**: Link hours worked to specific "Akce" (Projects) for accurate cost allocation.

### 💰 Financial Management (Náklady)
- **Expense Tracking**: Categorize and log all business expenses.
- **Fixed Costs Automation**: Automatically generates recurring monthly costs for better financial forecasting.
- **Division Tracking**: Track revenues and costs by division (e.g., Joinery vs. Interiors), including specific overhead allocation.

---

## 🛠️ Technology Stack

This project leverages the bleeding edge of the React ecosystem:

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety.
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) for a utility-first design system.
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) for reliable data storage.
- **State Management**: React Context API + SWR for data fetching.
- **PDF Generation**: `@react-pdf/renderer` for client-side PDF creation.
- **Icons**: Heroicons & specialized SVG assets.

---

## 🗄️ Database Schema

The application uses **Supabase (PostgreSQL)**.
> **Note:** A complete schema definition including indexes, functions, and policies can be found in [`db/schema.sql`](db/schema.sql).

### Entity Relationship Diagram

```mermaid
erDiagram
    organizations ||--o{ klienti : owns
    organizations ||--o{ pracovnici : owns
    organizations ||--o{ akce : pro
    organizations ||--o{ finance : tracks
    organizations ||--o{ fixed_costs : defines
    organizations ||--o{ nabidky : manages

    klienti ||--o{ akce : "requested by"
    klienti ||--o{ prace : "billed for"
    klienti ||--o{ nabidky : "receives"

    pracovnici ||--o{ prace : "logs"
    pracovnici ||--o{ mzdy : "earns"

    akce ||--o{ prace : "composed of"
    akce ||--o{ nabidky : "related to"

    nabidky ||--o{ polozky_nabidky : "contains"
    nabidky_stavy ||--o{ nabidky : "defines status"

    klienti {
        bigint id PK
        text nazev
        numeric sazba
    }

    pracovnici {
        bigint id PK
        text jmeno
        numeric hodinova_mzda
    }

    akce {
        bigint id PK
        text nazev
        date datum
        numeric cena_klient
    }

    nabidky {
        bigint id PK
        text nazev
        numeric celkova_cena
        date platnost_do
        text stav
    }

    polozky_nabidky {
        bigint id PK
        text nazev
        numeric celkem
    }

    mzdy {
        bigint id PK
        integer mesic
        integer rok
        numeric celkova_castka
    }

    finance {
        bigint id PK
        text typ
        numeric castka
    }

    fixed_costs {
        bigint id PK
        text nazev
        numeric castka
    }

    divisions {
        bigint id PK
        text nazev
    }

    divisions ||--o{ akce : "categorizes"
    divisions ||--o{ prace : "categorizes"
    divisions ||--o{ fixed_costs : "allocated to"
    divisions ||--o{ worker_divisions : "staffed by"
```

### Core Tables

- **`akce`**: Projects/Events linked to clients.
- **`nabidky`**: Price offers with status, validity, and total price.
- **`polozky_nabidky`**: Individual items within an offer.
- **`klienti`**: Customer database.
- **`pracovnici`**: Employee database.
- **`prace`**: Work logs linked to employees and projects.
- **`mzdy`**: Monthly salary records/calculations.
- **`finance`**: Income/Expense tracking.
- **`fixed_costs`**: Recurring monthly expenses.
- **`organizations`**: Multi-tenancy support.

---

## 🚀 Getting Started

Follow these steps to get the project up and running on your local machine.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/sebit-app.git
   cd sebit-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
    Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📚 Documentation & Workflows

- **Setup Supabase CLI**: Instructions for setting up local development with Supabase can be found in [`.agent/workflows/setup_supabase.md`](.agent/workflows/setup_supabase.md).

---

## 📂 Project Structure

```bash
├── app/                  # App Router pages and layouts
│   ├── dashboard/        # Analytics dashboard
│   ├── nabidky/          # Offers management
│   ├── klienti/          # Client management
│   ├── mzdy/             # Salary & payroll
│   ├── vykazy/           # Time reporting
│   └── ...
├── components/           # Reusable UI components
│   ├── nabidky/          # Offer-specific components (PDF, Forms)
│   ├── FaceAuthModal.tsx # Face authentication logic
│   └── ...
├── lib/                  # Business logic and utilities
│   ├── api/              # API wrappers for Supabase
│   ├── types/            # TypeScript interfaces
│   └── supabase.js       # Database client initialization
├── db/                   # Database schema and migration scripts
└── public/               # Static assets & images
```

---

**Developed for Interiéry Horyna**
