-- Align Role catalog copy with contractor / IC semantics for acq & dispo roles.
-- Enum codes stay ACQUISITIONS_MANAGER / DISPOSITIONS_MANAGER (legacy names).

UPDATE "Role"
SET
  "displayName" = 'Acquisitions contractor',
  "description" = 'Contractor / individual contributor on acquisitions (not a people-manager role).'
WHERE "code" = 'ACQUISITIONS_MANAGER';

UPDATE "Role"
SET
  "displayName" = 'Dispositions contractor',
  "description" = 'Contractor / individual contributor on dispositions (not a people-manager role).'
WHERE "code" = 'DISPOSITIONS_MANAGER';
