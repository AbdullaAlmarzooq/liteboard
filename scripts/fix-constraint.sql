-- Fix for workflow_steps category_code constraint
-- Run this in your Neon database to fix the constraint

-- Step 1: Drop the old constraint
ALTER TABLE workflow_steps 
DROP CONSTRAINT IF EXISTS chk_workflow_steps_category;

-- Step 2: Add the correct constraint for your data (1, 2, 30)
ALTER TABLE workflow_steps 
ADD CONSTRAINT chk_workflow_steps_category 
CHECK (category_code IN (1, 2, 30));

-- Verify the constraint was updated
SELECT 
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'workflow_steps'
    AND tc.constraint_name = 'chk_workflow_steps_category';

-- Should show: category_code IN (1, 2, 30)
