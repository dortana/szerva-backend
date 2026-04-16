import type { Request, Response } from "express";
import prisma from "@/config/db";
import logger from "@/utils/logger";
import { t } from "@/utils/i18nContext";
import { formatZodError } from "@/utils/functions";
import { z } from "zod";

export const getCustomers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany();
  res.json(users);
};

export const setLocationHandler = async (req: Request, res: Response) => {
  const userId = req.user?.userId!;
  const schema = z.object({
    locationId: z
      .string().min(1, "Location ID is required")
      .uuid("Invalid location id"),
  });

  try {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(result.error),
      });
    }

    const { locationId } = result.data;

    const existingLocation = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!existingLocation) {
      return res.status(404).json({
        message: t("Location not found"),
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        selectedLocationId: locationId,
      },
    });

    return res.status(200).json({
      location: existingLocation,
      message: t("Location set successfully"),
    });

  } catch (error) {
    logger.error("Update user info failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};
