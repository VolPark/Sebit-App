-- Migration: Support for Service Contracts and T&M Projects
-- Date: 2025-12-31

-- 1. Add project_type to akce table
-- This column distinguishes between 'STANDARD' (Fixed Price), 'SERVICE', and 'TM' (Time & Material) projects.
ALTER TABLE public.akce 
ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'STANDARD';

-- 2. Add akce_id to finance table
-- This allows linking specific income/expense records to a project, which is required for calculating revenue for Service/TM projects.
ALTER TABLE public.finance 
ADD COLUMN IF NOT EXISTS akce_id BIGINT REFERENCES public.akce(id) ON DELETE SET NULL;
