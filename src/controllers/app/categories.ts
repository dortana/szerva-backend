import { getCurrentLanguage, t } from "@/utils/i18nContext";
import type { Request, Response } from "express";
import logger from "@/utils/logger";
import { getEntriesByType, mapCategory } from "@/config/contentful/mappers";
import { CategoryDto } from "@/config/contentful/types";
import { getCategoriesFromContentful } from "@/config/contentful-dev/helper";
import { mapCategoriesResult } from "@/config/contentful-dev/mappers";

export const getCategories = async (req: Request, res: Response) => {
  try {
    const locale = getCurrentLanguage();
    if (process.env.NODE_ENV === "development") {
      //TODO: Remove this once we have the contentful integration working
      const categories = await getCategoriesFromContentful(locale);
      return res
        .status(200)
        .json({ categories: mapCategoriesResult(categories) });
    }
    const categories: CategoryDto[] = await getEntriesByType(
      "category",
      locale,
      mapCategory,
    );
    return res.status(200).json({ categories });
  } catch (error) {
    logger.error("Failed to resolve categories", { error });
    return res.status(500).json({ message: t("Internal server error") });
  }
};
