import { t } from "@/utils/i18nContext";
import type { Request, Response } from "express";
import prisma from "@/config/db";
import logger from "@/utils/logger";

export const getUserInformation = async (req: Request, res: Response) => {
  const userId = req.user?.userId!;
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        role: true,
        image: true,
        status: true,
        verified: true,
        twoFactorEnabled: true,
        onBoardingStatus: true,
        dateOfBirth: true,
        addresses: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!existingUser) {
      return res.status(409).json({
        message: t("No user found"),
      });
    }

    const { id, ...rest } = existingUser;

    return res.status(200).json({
      user: { userId: id, ...rest },
    });
  } catch (error) {
    logger.error("Get user info failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};
