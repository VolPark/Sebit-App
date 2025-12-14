-- Create fixed_costs table
CREATE TABLE public.fixed_costs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nazev text NOT NULL,
  castka numeric NOT NULL DEFAULT 0,
  rok integer NOT NULL,
  mesic integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  CONSTRAINT fixed_costs_pkey PRIMARY KEY (id),
  CONSTRAINT fixed_costs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Index for faster querying by period
CREATE INDEX idx_fixed_costs_org_rok_mesic ON public.fixed_costs USING btree (organization_id, rok, mesic);

-- Enable RLS (Security)
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

-- Policy (Assuming similar to other tables, adjust if needed)
CREATE POLICY "Users can view their organization's fixed costs" ON public.fixed_costs
USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their organization's fixed costs" ON public.fixed_costs
WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their organization's fixed costs" ON public.fixed_costs
USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete their organization's fixed costs" ON public.fixed_costs
USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));
