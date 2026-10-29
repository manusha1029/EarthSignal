CREATE TABLE environmental_reports (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  location_label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  photo_data_url TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under review', 'Resolved')),
  ai_analysis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_environmental_reports_created_at ON environmental_reports(created_at DESC);
CREATE INDEX idx_environmental_reports_location ON environmental_reports(latitude, longitude);