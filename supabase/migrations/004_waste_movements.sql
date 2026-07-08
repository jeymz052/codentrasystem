-- Extend movement_type enum to support waste / defect / reject tracking.
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'waste';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'defect';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'reject';
