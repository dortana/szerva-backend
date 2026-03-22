import { getServicesFromContentful } from "@/config/contentful/helper";
import { getCurrentLanguage, t } from "@/utils/i18nContext";
import type { Request, Response } from "express";
import logger from "@/utils/logger";
import { Entry } from "contentful";
import { ServiceSkeleton } from "@/config/contentful/types";
import { mapServiceBulk, mapSingleService } from "@/config/contentful/mappers";

export const getServices = async (req: Request, res: Response) => {
  const locale = getCurrentLanguage();
  const slug = req.query.slug as string | undefined;
  const baseSlug = req.query.baseSlug as string | undefined;
  try {
    const services = await getServicesFromContentful({
      locale,
      ...(slug && { slug }),
      ...(baseSlug && { baseSlug }),
    });

    if (slug) {
      return res
        .status(200)
        .json({ services: mapServicesSingleResult(services) });
    } else {
      return res.status(200).json({ services: mapServicesResult(services) });
    }
  } catch (error) {
    logger.error("Failed to fetch services from Contentful", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

export const mapServicesResult = (
  entries: Entry<ServiceSkeleton, undefined, string>[],
) => entries.map(mapServiceBulk);

export const mapServicesSingleResult = (
  entries: Entry<ServiceSkeleton, undefined, string>[],
) => entries.map(mapSingleService);
