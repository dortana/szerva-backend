import { UserRole } from "@/generated/prisma/enums";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
        sessionId: string;
      };
    }
  }
}

export type AddressDTO = {
  id: string;
  addressLine1: string;
  addressLine2?: string | undefined;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};
