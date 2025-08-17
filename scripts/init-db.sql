-- =================================================================
-- ROCKWELL DATABASE INITIALIZATION SCRIPT
-- =================================================================
-- This script initializes the PostgreSQL database for Rockwell

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the rockwell schema
CREATE SCHEMA IF NOT EXISTS rockwell;

-- Create a dedicated user for the application (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rockwell_user') THEN
        CREATE USER rockwell_user WITH ENCRYPTED PASSWORD 'rockwell_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA rockwell TO rockwell_user;
GRANT CREATE ON SCHEMA rockwell TO rockwell_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA rockwell TO rockwell_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA rockwell TO rockwell_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA rockwell GRANT ALL ON TABLES TO rockwell_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA rockwell GRANT ALL ON SEQUENCES TO rockwell_user;

-- Set search path
ALTER USER rockwell_user SET search_path = rockwell, public;

-- Create some initial indexes for performance
-- Note: Actual tables will be created by TypeORM migrations

-- Function to generate URNs
CREATE OR REPLACE FUNCTION rockwell.generate_urn(prefix text, suffix text DEFAULT NULL)
RETURNS text AS $$
DECLARE
    random_id text;
BEGIN
    -- Generate a random ID similar to nanoid
    random_id := COALESCE(suffix, encode(gen_random_bytes(4), 'hex'));
    RETURN format('nesting:%s:%s', prefix, random_id);
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION rockwell.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log initialization
INSERT INTO pg_stat_statements_info VALUES ('Rockwell database initialized') 
ON CONFLICT DO NOTHING;