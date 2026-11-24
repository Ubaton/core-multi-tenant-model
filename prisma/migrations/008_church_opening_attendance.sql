ALTER TABLE church_opening_registration
    ADD COLUMN registration_code TEXT NOT NULL
        DEFAULT ('REG-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 12))),
    ADD COLUMN checked_in_at TIMESTAMPTZ(3),
    ADD CONSTRAINT uq_church_opening_registration_code UNIQUE (tenant_id, registration_code);
