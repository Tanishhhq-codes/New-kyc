-- ============================================================
-- KYC Verification Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Table: kyc_submissions
create table if not exists public.kyc_submissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  full_name       text not null,
  aadhaar_number  text not null,
  pan_number      text not null,
  document_number text,
  document_urls   text[]          default '{}',
  status          text            not null default 'pending'
                    check (status in ('pending', 'under_review', 'approved', 'rejected')),
  rejection_note  text,
  submitted_at    timestamptz     not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references auth.users(id)
);

create index if not exists kyc_submissions_user_id_idx on public.kyc_submissions(user_id);
create index if not exists kyc_submissions_status_idx  on public.kyc_submissions(status);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.kyc_submissions enable row level security;

-- Users can read and insert only their own submissions
create policy "Users: select own" on public.kyc_submissions
  for select using (auth.uid() = user_id);

create policy "Users: insert own" on public.kyc_submissions
  for insert with check (auth.uid() = user_id);

-- Admin users can review all submissions.
-- Requires setting app_metadata.role = 'admin' for admin accounts.
create policy "Admins: select all submissions" on public.kyc_submissions
  for select using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins: update all submissions" on public.kyc_submissions
  for update using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================================
-- Storage bucket: kyc-documents
-- ============================================================
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict do nothing;

-- Users upload into their own folder only
create policy "Users: upload own docs" on storage.objects
  for insert with check (
    bucket_id = 'kyc-documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users read their own docs only
create policy "Users: read own docs" on storage.objects
  for select using (
    bucket_id = 'kyc-documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin users can view all KYC documents.
create policy "Admins: read all docs" on storage.objects
  for select using (
    bucket_id = 'kyc-documents' and
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
