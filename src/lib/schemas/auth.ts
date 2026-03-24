import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const truckerLoginSchema = z.object({
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .max(15, "Phone number is too long"),
  pin: z.string().length(6, "PIN must be 6 digits").regex(/^\d{6}$/, "PIN must be numeric"),
});

export const signupSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required").max(200),
    fullName: z.string().min(2, "Contact name is required").max(100),
    email: z.email("Please enter a valid email address"),
    phone: z
      .string()
      .min(10, "Please enter a valid phone number")
      .max(15, "Phone number is too long"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Trucker signup — requires first name, last name, phone, email, password.
 * Account is created with role "driver" and status "active".
 */
export const truckerSignupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    phone: z
      .string()
      .min(10, "Please enter a valid phone number")
      .max(15, "Phone number is too long"),
    email: z.email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Subcontractor (carrier) signup — requires company name, contact name, email,
 * phone, optional MC/DOT number, password.
 * Account is created with role "carrier" and status "active".
 */
export const subcontractorSignupSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required").max(200),
    contactName: z.string().min(2, "Contact name is required").max(100),
    email: z.email("Please enter a valid email address"),
    phone: z
      .string()
      .min(10, "Please enter a valid phone number")
      .max(15, "Phone number is too long"),
    mcNumber: z.string().max(20, "MC number is too long").optional(),
    dotNumber: z.string().max(20, "DOT number is too long").optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const passwordResetSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

export const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type TruckerLoginInput = z.infer<typeof truckerLoginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type TruckerSignupInput = z.infer<typeof truckerSignupSchema>;
export type SubcontractorSignupInput = z.infer<typeof subcontractorSignupSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
