import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const truckerLoginSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number"),
  pin: z.string().length(6, "PIN must be 6 digits"),
});

export const signupSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  fullName: z.string().min(2, "Contact name is required"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type TruckerLoginInput = z.infer<typeof truckerLoginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
