import type { Request, Response } from "express";
import prisma from "@/config/db";
import { z } from "zod";
import { formatZodError, searchAddress } from "@/utils/functions";
import logger from "@/utils/logger";
import { t } from "@/utils/i18nContext";
import { OnBoardingStatus, UserRole } from "@/generated/prisma/enums";
import { mapboxToAddress } from "@/utils/addressUtils";

const addressSchema = z.object({
  address: z.object({
    addressLine1: z
      .string()
      .min(1, { message: t("Address line 1 is required") }),
    addressLine2: z.string().optional(),

    unit: z.string().optional(),
    floor: z.string().optional(),
    building: z.string().optional(),
    entrance: z.string().optional(),
    notes: z.string().optional(),

    city: z.string().min(1, { message: t("City is required") }),
    state: z.string().optional(),
    postalCode: z.string().min(1, { message: t("Postal code is required") }),

    country: z.string().min(1, { message: t("Country is required") }),
    countryCode: z.string().min(1, { message: t("Country code is required") }),

    isPrimary: z.boolean().optional(),

    companyName: z.string().optional(),
    vatNumber: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export const newAddressHandler = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  if (!userId) {
    return res.status(401).json({ message: t("Unauthorized") });
  }

  try {
    const result = addressSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(result.error),
      });
    }

    const { address } = result.data;

    const newAddress = await prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });

      const isPrimary = count === 0 ? true : (address.isPrimary ?? false);

      if (isPrimary && count > 0) {
        await tx.address.updateMany({
          where: { userId },
          data: { isPrimary: false },
        });
      }

      const created = await tx.address.create({
        data: {
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 ?? null,

          unit: address.unit ?? null,
          floor: address.floor ?? null,
          building: address.building ?? null,
          entrance: address.entrance ?? null,
          notes: address.notes ?? null,

          city: address.city,
          state: address.state ?? null,
          postalCode: address.postalCode ?? null,

          country: address.country,
          countryCode: address.countryCode,

          isPrimary,

          companyName: address.companyName ?? null,
          vatNumber: address.vatNumber ?? null,
          email: address.email ?? null,
          phone: address.phone ?? null,

          userId,
        },
      });

      if (userRole === UserRole.EXPERT) {
        await tx.user.update({
          where: { id: userId },
          data: {
            onBoardingStatus: OnBoardingStatus.EXPERTISE_INFO,
          },
        });
      }

      return created;
    });

    return res.status(200).json({
      message: t("Address added successfully"),
      data: newAddress,
    });
  } catch (error) {
    logger.error("Adding address failed", { error });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

export const searchAddressHandler = async (req: Request, res: Response) => {
  try {
    const query = req.query.search;

    if (typeof query !== "string" || query.trim().length < 3) {
      return res.status(400).json({
        message: t("Search query must be at least 3 characters"),
      });
    }

    const features = await searchAddress(query);

    const addresses = features
      .filter((f) => f.place_type.includes("address"))
      .map(mapboxToAddress);

    return res.status(200).json({
      data: addresses,
    });
  } catch (error) {
    logger.error("Search address failed", { error });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};
