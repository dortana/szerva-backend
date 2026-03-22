import { getCategoriesFromContentful } from "@/config/contentful/helper";
import { getCurrentLanguage, t } from "@/utils/i18nContext";
import type { Request, Response } from "express";
import logger from "@/utils/logger";
import { Entry } from "contentful";
import { CategorySkeleton } from "@/config/contentful/types";
import { mapCategory } from "@/config/contentful/mappers";

export const getCategories = async (req: Request, res: Response) => {
  const locale = getCurrentLanguage();
  try {
    const categories = await getCategoriesFromContentful(locale);

    return res
      .status(200)
      .json({ categories: mapCategoriesResult(categories) });
  } catch (error) {
    logger.error("Failed to fetch categories from Contentful", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

export const mapCategoriesResult = (
  entries: Entry<CategorySkeleton, undefined, string>[],
) => entries.map(mapCategory);
