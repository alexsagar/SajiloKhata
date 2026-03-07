# Scripts Directory Audit

This folder contains utility scripts for local development and one-off maintenance tasks.

Important:

- These scripts are not part of production runtime.
- Review each script before running in shared or production databases.
- Always back up data before executing migration/seed scripts.

## Script Inventory

- `setup-database.js`
  - Creates collections and indexes for a local MongoDB database.
  - Useful for manual local bootstrap.

- `migrate-database.js`
  - Legacy migration bundle with multiple migration methods.
  - Use carefully; validate current schema compatibility first.

- `migrate-cents.js`
  - One-off migration to ensure `amountCents` and split cents fields exist.
  - Safe target: development/staging after backup.

- `seed-data.js`
  - Seeds sample users/groups/expenses for local testing.
  - Destructive for target DB (clears collections first).

- `expense-calculator.js`, `ocr-service.js`
  - Legacy utility scripts for experimentation/testing.
  - Not part of app startup path.

- `start-dev.sh`
  - Convenience shell script for Unix-like environments.

## Current Status

- No script is automatically invoked by backend/frontend startup.
- Backend-maintained operational script currently exposed via package scripts:
  - `backend/scripts/seed-notifications.js`

