-- 12_currency_rates.sql

-- 1. Currency Rates Cache
CREATE TABLE IF NOT EXISTS public.currency_rates (
    date date NOT NULL,
    currency text NOT NULL,
    rate numeric NOT NULL, -- The calculated rate per 1 unit (e.g. if amount=100 rate=25, stored rate is 0.25? No, usually CNB returns rate for amount. Let's store unit rate: RATE / AMOUNT)
    -- CNB Daily: "množství" (amount), "kurz" (rate).
    -- Example: HUF 100 = 6.50 CZK. Rate per 1 HUF = 0.065.
    -- We will store the rate for 1 UNIT.
    
    amount numeric DEFAULT 1, -- Original CNB amount (for reference)
    created_at timestamp with time zone DEFAULT now(),
    
    PRIMARY KEY (date, currency)
);

-- 2. Add CZK columns to Accounting Documents
ALTER TABLE public.accounting_documents 
ADD COLUMN IF NOT EXISTS amount_czk numeric,
ADD COLUMN IF NOT EXISTS exchange_rate numeric; -- Rate used for conversion

-- 3. Add CZK columns to Mappings
ALTER TABLE public.accounting_mappings 
ADD COLUMN IF NOT EXISTS amount_czk numeric;

-- Index for faster rate lookups
CREATE INDEX IF NOT EXISTS idx_currency_rates_date ON public.currency_rates(date);
