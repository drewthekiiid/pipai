-- Initialize PipAI Development Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create additional databases for development if needed
-- CREATE DATABASE pipai_test;

-- Create Temporal database for workflow orchestration
CREATE DATABASE temporal;
CREATE DATABASE temporal_visibility;

-- Grant permissions to the pipai user for all databases
GRANT ALL PRIVILEGES ON DATABASE pipai_dev TO pipai;
GRANT ALL PRIVILEGES ON DATABASE temporal TO pipai;
GRANT ALL PRIVILEGES ON DATABASE temporal_visibility TO pipai;

-- Enable necessary extensions
\c pipai_dev;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c temporal;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c temporal_visibility;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Switch back to main database
\c pipai_dev;

-- Create basic tables for the application (you can expand this as needed)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);

-- Insert a default development user (optional)
-- INSERT INTO users (email) VALUES ('dev@pipai.local') ON CONFLICT (email) DO NOTHING; 