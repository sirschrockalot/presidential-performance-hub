import { z } from 'zod';

// Central place for shared request/DTO validation schemas.
// Feature modules should define domain-specific schemas inside their own folders.
export const EmptySchema = z.object({});

