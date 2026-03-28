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

export const updateUserInformation = async (req: Request, res: Response) => {
  const userId = req.user?.userId!;

  try {
    const { firstName, lastName, dateOfBirth } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: t("No user found"),
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        dateOfBirth,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        image: true,
        dateOfBirth: true,
        updatedAt: true,
      },
    });

    const { id, ...rest } = updatedUser;

    return res.status(200).json({
      user: { userId: id, ...rest },
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
