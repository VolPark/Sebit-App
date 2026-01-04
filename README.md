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

When setting up a new Vercel project, configure these variables to customize the application.

### 1. Identity & Contact 
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_COMPANY_NAME` | Main App Title |
| `NEXT_PUBLIC_COMPANY_SHORT_NAME` | Short name used in file prefixes |
| `NEXT_PUBLIC_COMPANY_BILLING_NAME` | Full legal name for invoices |
| `NEXT_PUBLIC_FAVICON` | Path to favicon image |
| `NEXT_PUBLIC_LOGO_URL` | Path to dark/main logo (Sidebar) |
| `NEXT_PUBLIC_LOGO_LIGHT_URL` | Path to light/print logo (PDFs) |
| `NEXT_PUBLIC_SIGNATURE_URL` | Path to signature image for PDFs |
| `NEXT_PUBLIC_COMPANY_ADDRESS_LINE1` | Street Address |
| `NEXT_PUBLIC_COMPANY_CITY` | City and ZIP |
| `NEXT_PUBLIC_COMPANY_COUNTRY` | Country (default: Česká republika) |
| `NEXT_PUBLIC_COMPANY_PHONE` | Phone number |
| `NEXT_PUBLIC_COMPANY_WEB` | Website URL |
| `NEXT_PUBLIC_COMPANY_EMAIL` | Contact email |
| `NEXT_PUBLIC_COMPANY_ICO` | Company ID (IČO) |
| `NEXT_PUBLIC_COMPANY_DIC` | Tax ID (DIČ) |

### 2. Branding Colors (Required)
| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_BRAND_PRIMARY` | Main brand color (Buttons, Active states) | `#E30613` (Red) |
| `NEXT_PUBLIC_BRAND_PRIMARY_FOREGROUND` | Text color on primary background | `#ffffff` |
| `NEXT_PUBLIC_BRAND_ACCENT` | Secondary color for highlights | `#002B5C` |
| `NEXT_PUBLIC_PDF_THEME_COLOR` | Color used in generated PDFs headers | `#E30613` |

### 3. Feature Flags (Modules)
Control the visibility of application sections. Set to `false` to hide.

**Main Modules:**
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_ENABLE_DASHBOARD` | Enable Dashboard module |
| `NEXT_PUBLIC_ENABLE_OFFERS` | Enable Offers (Nabídky) module |
| `NEXT_PUBLIC_ENABLE_ADMIN` | Enable Administration module |
| `NEXT_PUBLIC_ENABLE_FINANCE` | Enable Finance module |
| `NEXT_PUBLIC_ENABLE_AI` | Enable AI Assistant |

**Dashboard Sub-features:**
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_ENABLE_DASHBOARD_FIRMA` | Company Overview tab |
| `NEXT_PUBLIC_ENABLE_DASHBOARD_WORKERS` | Employee Stats tab |
| `NEXT_PUBLIC_ENABLE_DASHBOARD_CLIENTS` | Client Overview tab |
| `NEXT_PUBLIC_ENABLE_DASHBOARD_EXPERIMENTAL` | Experimental features tab |

**Admin Sub-features:**
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_ENABLE_ADMIN_USERS` | User Management |
| `NEXT_PUBLIC_ENABLE_ADMIN_ACTIONS` | Project/Action Management |
| `NEXT_PUBLIC_ENABLE_ADMIN_CLIENTS` | Client Management |
| `NEXT_PUBLIC_ENABLE_ADMIN_WORKERS` | Worker Management |

**Finance Sub-features:**
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_ENABLE_FINANCE_REPORTS` | Work Reports (Výkazy) |
| `NEXT_PUBLIC_ENABLE_FINANCE_PAYROLL` | Payroll (Mzdy) |
| `NEXT_PUBLIC_ENABLE_FINANCE_COSTS` | Expenses (Náklady) |
| `NEXT_PUBLIC_ENABLE_FINANCE_TIMESHEETS` | Timesheet PDF Generation |

### 4. Application Configuration
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Full URL of the deployed application (for redirects) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key |
| `NEXT_PUBLIC_MATERIAL_LABEL` | Custom label for "Materiál" dimension (defaults to "Materiál"). Set to `HIDDEN` to hide completely. |


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

### 📄 Timesheets
- **Client & Worker Reports**: Generate detailed PDF reports for clients or workers.
- **Role-Based Grouping**: Client reports are automatically grouped by Worker Name and Role.
- **Monthly Overview**: View and download summaries of hours worked per month.

### 💰 Financial Management (Náklady)
- [x] Expense Tracking: Categorize and log all business expenses.
- [x] Fixed Costs Automation: Automatically generates recurring monthly costs.
- [x] Division Tracking: Track revenues and costs by division.
- [x] **Accounting Integration**: Sync invoices from external systems (UOL/Abra) and map them to projects or overhead.
- [x] **Currency Conversion**: Automatic conversion of foreign currency costs (EUR/USD) to CZK using daily CNB exchange rates.

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
  ORGANIZATIONS {
    uuid id PK
    text name
    text slug
    timestamptz created_at
  }

  DIVISIONS {
    int8 id PK
    text nazev
    uuid organization_id FK
    timestamptz created_at
  }

  APP_ADMINS {
    uuid user_id PK FK_auth_users
  }

  PROFILES {
    uuid id PK FK_auth_users
    app_role role
    text full_name
    timestamptz updated_at
  }

  ORGANIZATION_MEMBERS {
    uuid id PK
    uuid organization_id FK
    uuid user_id FK_auth_users
    text role
    timestamptz created_at
  }

  PRACOVNICI {
    int8 id PK
    text jmeno
    numeric hodinova_mzda
    text telefon
    bool is_active
    uuid organization_id FK
    uuid user_id FK_auth_users
    text role
  }

  KLIENTI {
    int8 id PK
    text nazev
    numeric sazba
    text email
    text poznamka
    uuid organization_id FK
    text ico
    text dic
    text address
  }

  AKCE {
    int8 id PK
    text nazev
    date datum
    int8 klient_id FK
    numeric cena_klient
    numeric material_klient
    numeric material_my
    numeric odhad_hodin
    timestamptz created_at
    bool is_completed
    uuid organization_id FK
    int8 division_id FK
    text project_type
  }

  NABIDKY_STAVY {
    int8 id PK
    text nazev
    text color
    int4 poradi
  }

  NABIDKY {
    int8 id PK
    timestamptz created_at
    text nazev
    int8 klient_id FK
    numeric celkova_cena
    text stav
    text poznamka
    int8 akce_id FK
    int8 stav_id FK
    text cislo
    date platnost_do
    int8 division_id FK
  }

  POLOZKY_NABIDKY {
    int8 id PK
    int8 nabidka_id FK
    text nazev
    text typ
    numeric mnozstvi
    numeric cena_ks
    numeric celkem
    text popis
    text obrazek_url
    numeric sazba_dph
  }

  POLOZKY_TYPY {
    int8 id PK
    text nazev
    timestamptz created_at
  }

  FINANCE {
    int8 id PK
    date datum
    text typ
    numeric castka
    text poznamka
    text popis
    uuid organization_id FK
    int8 division_id FK
    int8 akce_id FK
    text variable_symbol
    text invoice_number
    date due_date
    text supplier_ico
    text supplier_name
    text payment_method
    text category
  }

  FIXED_COSTS {
    int8 id PK
    text nazev
    numeric castka
    int4 rok
    int4 mesic
    timestamptz created_at
    uuid organization_id FK
    int8 division_id FK
  }

  MZDY {
    int8 id PK
    int8 pracovnik_id FK
    int4 mesic
    int4 rok
    numeric hruba_mzda
    numeric faktura
    numeric priplatek
    timestamptz created_at
    uuid organization_id FK
    numeric celkova_castka
  }

  PRACE {
    int8 id PK
    date datum
    text popis
    numeric pocet_hodin
    int8 klient_id FK
    int8 pracovnik_id FK
    int8 akce_id FK
    uuid organization_id FK
    int8 division_id FK
  }

  WORKER_DIVISIONS {
    int8 id PK
    int8 worker_id FK
    int8 division_id FK
    uuid organization_id FK
    timestamptz created_at
  }

  ACCOUNTING_PROVIDERS {
    int8 id PK
    text code
    text name
    bool is_enabled
    jsonb config
    timestamptz created_at
  }

  ACCOUNTING_DOCUMENTS {
    int8 id PK
    int8 provider_id FK
    text external_id
    text type
    text number
    text supplier_name
    text supplier_ico
    numeric amount
    text currency
    date issue_date
    date due_date
    date tax_date
    text description
    text status
    jsonb raw_data
    timestamptz created_at
    timestamptz updated_at
    text supplier_dic
    numeric paid_amount
    numeric amount_czk
    numeric exchange_rate
  }

  ACCOUNTING_MAPPINGS {
    int8 id PK
    int8 document_id FK
    int8 akce_id FK
    int8 pracovnik_id FK
    int8 division_id FK
    text cost_category
    numeric amount
    text note
    timestamptz created_at
    numeric amount_czk
  }

  ACCOUNTING_SYNC_LOGS {
    int8 id PK
    int8 provider_id FK
    timestamptz started_at
    timestamptz ended_at
    text status
    int4 records_processed
    text error_message
  }

  CURRENCY_RATES {
    date date PK
    text currency PK
    numeric rate
    numeric amount
    timestamptz created_at
  }

  ACCOUNTING_JOURNAL {
    int8 id PK
    text uol_id
    date date
    text account_md
    text account_d
    numeric amount
    text currency
    text text
    int4 fiscal_year
    timestamptz created_at
  }

  ACCOUNTING_BANK_MOVEMENTS {
    int8 id PK
    text bank_account_id
    text movement_id
    date date
    numeric amount
    text currency
    text variable_symbol
    text description
    jsonb raw_data
    timestamptz created_at
  }

  ACCOUNTING_ACCOUNTS {
    int8 id PK
    text code
    text name
    text type
    bool active
    timestamptz created_at
  }

  ACCOUNTING_BANK_ACCOUNTS {
    text bank_account_id PK
    text custom_name
    timestamptz created_at
    timestamptz updated_at
    text account_number
    text bank_code
    text currency
    numeric opening_balance
    text name
    timestamptz last_synced_at
  }

  %% Foreign key relationships
  DIVISIONS ||--o{ ORGANIZATIONS : "organization_id -> id"
  DIVISIONS ||--o{ ACCOUNTING_MAPPINGS : "division_id -> id"
  DIVISIONS ||--o{ PRACE : "division_id -> id"
  DIVISIONS ||--o{ WORKER_DIVISIONS : "division_id -> id"
  DIVISIONS ||--o{ NABIDKY : "division_id -> id"
  DIVISIONS ||--o{ AKCE : "division_id -> id"
  DIVISIONS ||--o{ FINANCE : "division_id -> id"
  DIVISIONS ||--o{ FIXED_COSTS : "division_id -> id"

  ORGANIZATIONS ||--o{ DIVISIONS : "id -> organization_id"
  ORGANIZATIONS ||--o{ WORKER_DIVISIONS : "id -> organization_id"
  ORGANIZATIONS ||--o{ PRACE : "id -> organization_id"
  ORGANIZATIONS ||--o{ MZDY : "id -> organization_id"
  ORGANIZATIONS ||--o{ FIXED_COSTS : "id -> organization_id"
  ORGANIZATIONS ||--o{ FINANCE : "id -> organization_id"
  ORGANIZATIONS ||--o{ AKCE : "id -> organization_id"
  ORGANIZATIONS ||--o{ KLIENTI : "id -> organization_id"
  ORGANIZATIONS ||--o{ PRACOVNICI : "id -> organization_id"
  ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : "id -> organization_id"

  PRACOVNICI ||--o{ WORKER_DIVISIONS : "id -> worker_id"
  PRACOVNICI ||--o{ PRACE : "id -> pracovnik_id"
  PRACOVNICI ||--o{ MZDY : "id -> pracovnik_id"
  PRACOVNICI ||--o{ ACCOUNTING_MAPPINGS : "id -> pracovnik_id"

  KLIENTI ||--o{ PRACE : "id -> klient_id"
  KLIENTI ||--o{ AKCE : "id -> klient_id"
  KLIENTI ||--o{ NABIDKY : "id -> klient_id"

  AKCE ||--o{ FINANCE : "id -> akce_id"
  AKCE ||--o{ ACCOUNTING_MAPPINGS : "id -> akce_id"
  AKCE ||--o{ NABIDKY : "id -> akce_id"
  AKCE ||--o{ PRACE : "id -> akce_id"

  NABIDKY_STAVY ||--o{ NABIDKY : "id -> stav_id"

  NABIDKY ||--o{ POLOZKY_NABIDKY : "id -> nabidka_id"

  ACCOUNTING_PROVIDERS ||--o{ ACCOUNTING_SYNC_LOGS : "id -> provider_id"
  ACCOUNTING_PROVIDERS ||--o{ ACCOUNTING_DOCUMENTS : "id -> provider_id"

  ACCOUNTING_DOCUMENTS ||--o{ ACCOUNTING_MAPPINGS : "id -> document_id"

  ACCOUNTING_MAPPINGS ||--o{ DIVISIONS : "division_id -> id"
  ACCOUNTING_MAPPINGS ||--o{ PRACOVNICI : "pracovnik_id -> id"
  ACCOUNTING_MAPPINGS ||--o{ AKCE : "akce_id -> id"
  ACCOUNTING_MAPPINGS ||--o{ ACCOUNTING_DOCUMENTS : "document_id -> id"

  ACCOUNTING_SYNC_LOGS ||--o{ ACCOUNTING_PROVIDERS : "provider_id -> id"

  MZDY ||--o{ PRACOVNICI : "pracovnik_id -> id"

  PRACE ||--o{ PRACOVNICI : "pracovnik_id -> id"
  PRACE ||--o{ KLIENTI : "klient_id -> id"
  PRACE ||--o{ AKCE : "akce_id -> id"

  WORKER_DIVISIONS ||--o{ PRACOVNICI : "worker_id -> id"
  WORKER_DIVISIONS ||--o{ DIVISIONS : "division_id -> id"

  FINANCE ||--o{ ORGANIZATIONS : "organization_id -> id"
  FINANCE ||--o{ DIVISIONS : "division_id -> id"
  FINANCE ||--o{ AKCE : "akce_id -> id"

  FIXED_COSTS ||--o{ ORGANIZATIONS : "organization_id -> id"
  FIXED_COSTS ||--o{ DIVISIONS : "division_id -> id"

  ACCOUNTING_BANK_ACCOUNTS ||--o{ ACCOUNTING_BANK_MOVEMENTS : "bank_account_id -> bank_account_id"
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
- **`accounting_documents`**: Invoices synced from external providers.
- **`accounting_mappings`**: Links between invoices and internal projects/categories.
- **`currency_rates`**: Cache of daily CNB exchange rates.
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
