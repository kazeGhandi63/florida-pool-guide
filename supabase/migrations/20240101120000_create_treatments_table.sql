create table "public"."treatments" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "pool_id" uuid not null,
    "user_id" uuid not null,
    "bicarb_cups_added" real,
    "calcium_cups_added" real,
    "treatment_date" date not null default now()
);


alter table "public"."treatments" enable row level security;

CREATE UNIQUE INDEX treatments_pkey ON public.treatments USING btree (id);

alter table "public"."treatments" add constraint "treatments_pkey" PRIMARY KEY using index "treatments_pkey";

alter table "public"."treatments" add constraint "treatments_pool_id_fkey" FOREIGN KEY (pool_id) REFERENCES pools(id) on delete cascade not valid;

alter table "public"."treatments" validate constraint "treatments_pool_id_fkey";

alter table "public"."treatments" add constraint "treatments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) on delete cascade not valid;

alter table "public"."treatments" validate constraint "treatments_user_id_fkey";

create policy "Allow authenticated users to manage their own treatments"
on "public"."treatments"
as permissive
for all
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));