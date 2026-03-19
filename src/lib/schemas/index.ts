export { loginSchema, truckerLoginSchema, signupSchema } from "./auth";
export type { LoginInput, TruckerLoginInput, SignupInput } from "./auth";

export {
  materialTypeSchema,
  deliveryConfirmationSchema,
  createOrderSchema,
} from "./delivery";
export type {
  MaterialType,
  DeliveryConfirmationInput,
  CreateOrderInput,
} from "./delivery";
