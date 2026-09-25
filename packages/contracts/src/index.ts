import { z } from 'zod';

export const customerTypes = ['individual', 'company', 'b2b'] as const;
export const complaintStatuses = [
  'New',
  'Under Review',
  'Pending Information',
  'Ready for Scheduling',
  'Scheduled',
  'Closed',
  'Cancelled',
] as const;

export const complaintStatusSchema = z.enum(complaintStatuses);
export const customerTypeSchema = z.enum(customerTypes);

const optionalText = (maximum: number) => z.string().trim().min(1).max(maximum).optional();

export const publicComplaintSchema = z
  .object({
    customerType: customerTypeSchema,
    customerName: z.string().trim().min(1).max(200),
    contactNumber: z.string().trim().min(1).max(50),
    customerEmail: z.string().trim().email().max(320).optional(),
    address: optionalText(500),
    region: optionalText(120),
    brand: optionalText(120),
    model: optionalText(120),
    serialOrItemCode: optionalText(120),
    description: z.string().trim().min(1).max(10000),
  })
  .strict();

export type PublicComplaintInput = z.infer<typeof publicComplaintSchema>;

const queryNumber = (defaultValue: number, minimum: number, maximum: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? defaultValue : Number(value)),
    z.number().int().min(minimum).max(maximum),
  );

export const complaintListQuerySchema = z
  .object({
    status: complaintStatusSchema.optional(),
    region: z.string().trim().min(1).max(120).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    page: queryNumber(1, 1, 100000),
    pageSize: queryNumber(25, 1, 100),
  })
  .strict();

export type ComplaintListQuery = z.infer<typeof complaintListQuerySchema>;

export const complaintNotesSchema = z
  .object({
    notes: z.string().trim().min(1).max(10000),
  })
  .strict();

export type ComplaintNotesInput = z.infer<typeof complaintNotesSchema>;

export const complaintStatusUpdateSchema = z
  .object({
    status: complaintStatusSchema,
    reason: z.string().trim().max(1000).optional(),
  })
  .strict();

export type ComplaintStatusUpdateInput = z.infer<typeof complaintStatusUpdateSchema>;

export type ComplaintStatus = (typeof complaintStatuses)[number];
export type CustomerType = (typeof customerTypes)[number];
