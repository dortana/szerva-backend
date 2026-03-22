import type { Request, Response } from "express";
import prisma from "@/config/db";
import { t } from "@/utils/i18nContext";
import { z } from "zod";
import { formatZodError } from "@/utils/functions";
import logger from "@/utils/logger";

export const addLocationHandler = async (req: Request, res: Response) => {
  const locationSchema = z.object({
    country: z.string().length(2, "Country must be 2-letter ISO code"),

    state: z.string().min(1, "State is required"),

    city: z.string().min(1, "City is required"),

    latitude: z
      .string()
      .refine((val) => !isNaN(Number(val)), {
        message: "Latitude must be a valid number",
      })
      .transform((val) => Number(val)),

    longitude: z
      .string()
      .refine((val) => !isNaN(Number(val)), {
        message: "Longitude must be a valid number",
      })
      .transform((val) => Number(val)),

    isActive: z.enum(["true", "false"]).transform((val) => val === "true"),
  });
  try {
    const result = locationSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(result.error),
      });
    }

    const { city } = result.data;

    const existingLocation = await prisma.location.findFirst({
      where: { city },
    });

    if (existingLocation) {
      return res.status(400).json({
        message: t("Location with this city already exists."),
      });
    }

    await prisma.location.create({
      data: {
        ...result.data,
        services: [],
      },
    });

    return res.status(200).json({
      message: t("Location added successfully."),
    });
  } catch (error) {
    logger.error("Add location failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

export const editLocationHandler = async (req: Request, res: Response) => {
  const querySchema = z.object({
    locationId: z.string().uuid("Invalid location id"),
  });

  const locationSchema = z.object({
    country: z.string().length(2, "Country must be 2-letter ISO code"),

    state: z.string().min(1, "State is required"),

    city: z.string().min(1, "City is required"),

    latitude: z
      .string()
      .refine((val) => !isNaN(Number(val)), {
        message: "Latitude must be a valid number",
      })
      .transform((val) => Number(val)),

    longitude: z
      .string()
      .refine((val) => !isNaN(Number(val)), {
        message: "Longitude must be a valid number",
      })
      .transform((val) => Number(val)),

    isActive: z.enum(["true", "false"]).transform((val) => val === "true"),
  });
  try {
    const queryResult = querySchema.safeParse(req.query);

    if (!queryResult.success) {
      return res.status(400).json({
        message: t("Invalid location id"),
        errors: formatZodError(queryResult.error),
      });
    }

    const { locationId } = queryResult.data;

    const result = locationSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(result.error),
      });
    }

    const { city } = result.data;

    const existingLocation = await prisma.location.findFirst({
      where: { id: locationId },
    });

    if (!existingLocation) {
      return res.status(404).json({
        message: t("Location not found."),
      });
    }

    // ✅ Prevent duplicate city (except itself)
    const duplicateCity = await prisma.location.findFirst({
      where: {
        city,
        NOT: { id: locationId },
      },
    });

    if (duplicateCity) {
      return res.status(400).json({
        message: t("Location with this city already exists."),
      });
    }

    await prisma.location.update({
      where: { id: locationId },
      data: result.data,
    });

    return res.status(200).json({
      message: t("Location updated successfully."),
    });
  } catch (error) {
    logger.error("Add location failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};
