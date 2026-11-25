ALTER TABLE church_opening_registration
    ADD COLUMN receipt_sent_at TIMESTAMPTZ(3),
    ADD COLUMN receipt_send_started_at TIMESTAMPTZ(3);
