import type { Request, Response } from "express";
import prisma from "@/config/db";
import { t } from "@/utils/i18nContext";
import logger from "@/utils/logger";

export const logoutHandler = async (req: Request, res: Response) => {
  const userId = req.user?.userId!;

  try {
    const existingUser = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(409).json({
        message: t("No user found"),
      });
    }

    const sessionId = req.user?.sessionId!;

    await prisma.session.delete({
      where: { id: sessionId, userId },
    });

    return res.status(200).json({
      message: t("Logout successful."),
    });
  } catch (error) {
    logger.error("Logout failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};
