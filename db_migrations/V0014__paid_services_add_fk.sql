ALTER TABLE paid_services
  ADD COLUMN IF NOT EXISTS applicant_id INTEGER REFERENCES applicants(id),
  ADD COLUMN IF NOT EXISTS service_catalog_id INTEGER REFERENCES service_catalog(id);
