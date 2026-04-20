import { getCurrentLanguage, t } from "@/utils/i18nContext";
import type { Request, Response } from "express";
import logger from "@/utils/logger";
import {
  getEntriesByType,
  mapServiceCarousel,
  mapSingleService,
} from "@/config/contentful/mappers";
import { ServiceCarouselDto, ServiceDto } from "@/config/contentful/types";

export const getServices = async (req: Request, res: Response) => {
  const locale = getCurrentLanguage();
  const slug = req.query.slug as string | undefined;
  const baseSlug = req.query.baseSlug as string | undefined;

  try {
    //@ts-ignore
    const allServices: ServiceDto[] = await getEntriesByType(
      "service",
      locale,
      mapSingleService,
    );

    let filteredServices = allServices;

    if (slug) {
      filteredServices = allServices.filter((s) => s.slug === slug);
    }

    if (baseSlug) {
      filteredServices = allServices.filter(
        (s) => s.baseCategory?.slug === baseSlug,
      );
    }
    if (!slug) {
      const bulkServices = filteredServices.map(
        ({ questions, ...rest }) => rest,
      );
      return res.status(200).json({ services: bulkServices });
    }
    return res.status(200).json({ services: filteredServices });
  } catch (error) {
    logger.error("Failed to resolve services", { error });
    return res.status(500).json({ message: t("Internal server error") });
  }
};

export const getServiceCarousel = async (req: Request, res: Response) => {
  const locale = getCurrentLanguage();
  try {
    const carousels = await getEntriesByType<ServiceCarouselDto>(
      "serviceCarousel",
      locale,
      mapServiceCarousel,
    );

    return res.status(200).json({ carousels });
  } catch (error) {
    logger.error("Failed to resolve service carousels", { error });
    return res.status(500).json({ message: t("Internal server error") });
  }
};
