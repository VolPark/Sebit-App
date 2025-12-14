-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.akce (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nazev text NOT NULL,
  datum date NOT NULL,
  klient_id bigint,
  cena_klient numeric NOT NULL DEFAULT 0,
  material_klient numeric NOT NULL DEFAULT 0,
  material_my numeric NOT NULL DEFAULT 0,
  odhad_hodin numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_completed boolean DEFAULT false,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  CONSTRAINT akce_pkey PRIMARY KEY (id),
  CONSTRAINT akce_klient_fk FOREIGN KEY (klient_id) REFERENCES public.klienti(id),
  CONSTRAINT akce_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.app_admins (
  user_id uuid NOT NULL,
  CONSTRAINT app_admins_pkey PRIMARY KEY (user_id),
  CONSTRAINT app_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.finance (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  datum date DEFAULT CURRENT_DATE,
  typ text CHECK (typ = ANY (ARRAY['Příjem'::text, 'Výdej'::text])),
  castka numeric,
  poznamka text,
  popis text,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  CONSTRAINT finance_pkey PRIMARY KEY (id),
  CONSTRAINT finance_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.klienti (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nazev text NOT NULL,
  sazba numeric,
  email text,
  poznamka text,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  CONSTRAINT klienti_pkey PRIMARY KEY (id),
  CONSTRAINT klienti_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.mzdy (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pracovnik_id bigint,
  mesic integer NOT NULL,
  rok integer NOT NULL,
  hruba_mzda numeric,
  faktura numeric,
  priplatek numeric,
  created_at timestamp with time zone DEFAULT now(),
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  celkova_castka numeric DEFAULT ((COALESCE(hruba_mzda, (0)::numeric) + COALESCE(faktura, (0)::numeric)) + COALESCE(priplatek, (0)::numeric)),
  CONSTRAINT mzdy_pkey PRIMARY KEY (id),
  CONSTRAINT mzdy_pracovnik_id_fkey FOREIGN KEY (pracovnik_id) REFERENCES public.pracovnici(id),
  CONSTRAINT mzdy_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.prace (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  datum date DEFAULT CURRENT_DATE,
  popis text,
  pocet_hodin numeric,
  klient_id bigint,
  pracovnik_id bigint,
  akce_id bigint,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  CONSTRAINT prace_pkey PRIMARY KEY (id),
  CONSTRAINT prace_klient_id_fkey FOREIGN KEY (klient_id) REFERENCES public.klienti(id),
  CONSTRAINT prace_pracovnik_id_fkey FOREIGN KEY (pracovnik_id) REFERENCES public.pracovnici(id),
  CONSTRAINT prace_akce_fk FOREIGN KEY (akce_id) REFERENCES public.akce(id),
  CONSTRAINT prace_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.pracovnici (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  jmeno text NOT NULL,
  hodinova_mzda numeric,
  telefon text,
  is_active boolean DEFAULT true,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  CONSTRAINT pracovnici_pkey PRIMARY KEY (id),
  CONSTRAINT pracovnici_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Indexes verified from database
CREATE INDEX idx_akce_datum ON public.akce USING btree (datum);
CREATE INDEX idx_akce_klient ON public.akce USING btree (klient_id);
CREATE INDEX idx_akce_klient_org ON public.akce USING btree (organization_id, klient_id);

CREATE INDEX idx_finance_organization_id ON public.finance USING btree (organization_id);

CREATE INDEX idx_klienti_org_id_slozeny ON public.klienti USING btree (organization_id, id);

CREATE UNIQUE INDEX mzdy_pracovnik_id_mesic_rok_key ON public.mzdy USING btree (pracovnik_id, mesic, rok);

CREATE UNIQUE INDEX organization_members_org_user_key ON public.organization_members USING btree (organization_id, user_id);
CREATE UNIQUE INDEX organization_members_organization_id_user_id_key ON public.organization_members USING btree (organization_id, user_id);

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);

CREATE INDEX idx_prace_akce_id ON public.prace USING btree (akce_id);
CREATE INDEX idx_prace_datum ON public.prace USING btree (datum);
CREATE INDEX idx_prace_klient_org ON public.prace USING btree (organization_id, klient_id);
CREATE INDEX idx_prace_pracovnik_org ON public.prace USING btree (organization_id, pracovnik_id);

CREATE INDEX idx_pracovnici_org_id_slozeny ON public.pracovnici USING btree (organization_id, id);
