import type { Request, Response } from "express";
import prisma from "@/config/db";
import logger from "@/utils/logger";
import { t } from "@/utils/i18nContext";

export const getLocations = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const search = (req.query.search as string) || "";
    const limit = parseInt((req.query.limit as string) || "10", 10);
    const sort = (req.query.sort as string) || "createdAt";
    const order = (req.query.order as string) || "desc";

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        error: t("Invalid page or limit"),
      });
    }

    const skip = (page - 1) * limit;

    const validSortFields = ["createdAt", "updatedAt"] as const;
    const sortField = validSortFields.includes(sort as any)
      ? sort
      : "createdAt";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const whereClause: any = {};

    // search filter
    if (search) {
      const num = Number(search);

      whereClause.OR = [
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
        ...(Number.isFinite(num) ? [{ latitude: num }] : []),
        ...(Number.isFinite(num) ? [{ longitude: num }] : []),
      ];
    }

    const [locations, totalData] = await Promise.all([
      prisma.location.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          [sortField]: sortOrder,
        },
      }),
      prisma.location.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(totalData / limit);

    return res.status(200).json({
      data: {
        locations,
        pagination: {
          page,
          limit,
          totalCount: totalData,
          totalPages,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to fetch locations", { error });

    return res.status(500).json({
      error: t("Internal server error"),
    });
  }
};
