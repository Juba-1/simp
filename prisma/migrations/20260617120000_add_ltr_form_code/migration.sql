-- Add Lab Test Report (LTR) to the StandardFormCode enum.
-- Field-based laboratory workflow: Lab Technicians initiate LTR forms in the field.
ALTER TYPE "StandardFormCode" ADD VALUE IF NOT EXISTS 'LTR';
