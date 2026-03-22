import type { Request, Response } from "express";
import prisma from "@/config/db";
import logger from "@/utils/logger";
// import { UserRole } from "@/generated/prisma/enums";
import { t } from "@/utils/i18nContext";

export const getExperts = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const firstName = (req.query.firstName as string) || "";
    const lastName = (req.query.lastName as string) || "";
    const limit = parseInt((req.query.limit as string) || "10", 10);
    const sort = (req.query.sort as string) || "createdAt";
    const order = (req.query.order as string) || "desc";

    const status =
      typeof req.query.status === "string" ? req.query.status.split(",") : [];

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        error: t("Invalid page or limit"),
      });
    }

    const skip = (page - 1) * limit;

    const validSortFields = [
      "createdAt",
      "updatedAt",
      "status",
      "role",
    ] as const;
    const sortField = validSortFields.includes(sort as any)
      ? sort
      : "createdAt";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const whereClause: any = {
      //   role: UserRole.EXPERT, TODO
    };

    // 🔍 first name filter
    if (firstName) {
      whereClause.firstName = {
        contains: firstName,
        mode: "insensitive",
      };
    }

    // 🔍 last name filter
    if (lastName) {
      whereClause.lastName = {
        contains: lastName,
        mode: "insensitive",
      };
    }

    // 🔍 status filter
    if (status.length > 0) {
      whereClause.status = {
        in: status,
      };
    }

    const [experts, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          [sortField]: sortOrder,
        },
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
        },
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      data: {
        experts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to fetch experts", { error });

    return res.status(500).json({
      error: t("Internal server error"),
    });
  }
};
