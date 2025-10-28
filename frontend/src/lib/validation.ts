import { z } from "zod"

export const ExpenseSplitSchema = z.object({
  user: z.string().min(1),
  amount: z.union([z.number(), z.string()]).optional(),
  percentage: z.number().min(0).max(100).optional().nullable(),
})

export const CreateExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.union([z.number(), z.string()]),
  category: z.enum(['food','transportation','accommodation','entertainment','utilities','shopping','healthcare','other']).optional(),
  date: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
  groupId: z.string().optional(), // Optional for personal expenses
  splitType: z.enum(['equal','percentage','exact']).optional(),
  splits: z.array(ExpenseSplitSchema).optional(), // Optional for personal expenses
  currencyCode: z.string().optional()
}).strict()

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>

export function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}