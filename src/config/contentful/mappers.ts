import path from "node:path";
import fs from "node:fs/promises";
import { ServiceCarouselDto, ServiceDto } from "./types";

const DEFAULT_LOCALE = "en-US";

const getLocaleValue = (field: any, locale: string) => {
  if (!field) return undefined;

  // 1. Try the requested locale (e.g., hu-HU)
  // 2. If it's missing, fall back to the default (e.g., en-US)
  return field[locale] !== undefined ? field[locale] : field[DEFAULT_LOCALE];
};

const resolveAssetUrl = (
  assetLink: any,
  assetsMap: Map<string, any>,
  locale: string,
) => {
  if (!assetLink?.sys?.id) return undefined;
  const resAsset = assetsMap.get(assetLink.sys.id);
  const file = getLocaleValue(resAsset?.fields?.file, locale);
  return file?.url ? `https:${file.url}` : undefined;
};

const mapCategorySummary = (catEntry: any, locale: string) => {
  if (!catEntry || !catEntry.fields) {
    return undefined;
  }
  const v = (field: any) => getLocaleValue(field, locale);

  return {
    id: catEntry.sys.id,
    title: v(catEntry.fields.title),
    slug: v(catEntry.fields.slug),
    iconUrl: v(catEntry.fields.iconUrl),
    isActive: v(catEntry.fields.isActive) ?? false,
  };
};

export const mapOption = (entry: any, locale: string) => {
  const v = (field: any) => getLocaleValue(field, locale);
  return {
    id: entry.sys.id,
    title: v(entry.fields.title),
    value: v(entry.fields.value),
    isDefaultAnswer: v(entry.fields.isDefaultAnswer) ?? false,
  };
};

export const mapQuestion = (
  entry: any,
  entriesMap: Map<string, any>,
  locale: string,
) => {
  const v = (field: any) => getLocaleValue(field, locale);

  const optionLinks = v(entry.fields.options) ?? [];
  const parentOptionLinks = v(entry.fields.requiredParentOption) ?? [];

  return {
    id: entry.sys.id,
    title: v(entry.fields.title),
    description: v(entry.fields.description),
    questionType: v(entry.fields.questionType),
    isMandatory: v(entry.fields.isMandatory) ?? false,
    minAnswers: v(entry.fields.minAnswers),
    maxAnswers: v(entry.fields.maxAnswers),
    options: optionLinks
      .map((link: any) => entriesMap.get(link.sys.id))
      .filter(Boolean)
      .map((opt: any) => mapOption(opt, locale)),
    requiredParentOptionIds: parentOptionLinks.map((link: any) => link.sys.id),
  };
};

export const mapCategory = (
  entry: any,
  entriesMap: Map<string, any>,
  locale: string,
): any => {
  const v = (field: any) => getLocaleValue(field, locale);

  const rawParent = entriesMap.get(v(entry.fields.parentCategory)?.sys.id);
  const parentCategory = mapCategorySummary(rawParent, locale);

  return {
    id: entry.sys.id,
    title: v(entry.fields.title),
    slug: v(entry.fields.slug),
    iconUrl: v(entry.fields.iconUrl),
    isActive: v(entry.fields.isActive) ?? false,
    ...(parentCategory !== undefined ? { parentCategory } : {}),
  };
};

export const mapSingleService = (
  entry: any,
  entriesMap: Map<string, any>,
  locale: string,
) => {
  const v = (field: any) => getLocaleValue(field, locale);

  const mainCatRaw = entriesMap.get(v(entry.fields.mainCategory)?.sys.id);
  const baseCatRaw = entriesMap.get(v(entry.fields.baseCategory)?.sys.id);
  const mainCategory = mapCategorySummary(mainCatRaw, locale);
  const baseCategory = mapCategorySummary(baseCatRaw, locale);

  return {
    id: entry.sys.id,
    title: v(entry.fields.title),
    description: v(entry.fields.description),
    slug: v(entry.fields.slug),
    iconUrl: v(entry.fields.iconUrl),
    isAgreementNeeded: v(entry.fields.isAgreementNeeded) ?? false,
    isActive: v(entry.fields.isActive) ?? false,
    mainCategory,
    baseCategory,
    questions: (v(entry.fields.questions) ?? [])
      .map((link: any) => entriesMap.get(link.sys.id))
      .filter(Boolean)
      .map((q: any) => mapQuestion(q, entriesMap, locale)),
  };
};

export const getEntriesByType = async <T>(
  contentType: string,
  locale: string,
  mapper: (entry: any, entriesMap: Map<string, any>, locale: string) => T,
): Promise<T[]> => {
  try {
    const rawData = await fs.readFile(
      path.join(process.cwd(), "services-data.json"),
      "utf8",
    );
    const json = JSON.parse(rawData);

    const entriesMap = new Map<string, any>(
      json.entries.map((e: any) => [e.sys.id, e]),
    );
    const assetsMap = new Map<string, any>(
      json.assets.map((a: any) => [a.sys.id, a]),
    );

    const filteredEntries = json.entries.filter(
      (entry: any) => entry.sys.contentType?.sys?.id === contentType,
    );

    return filteredEntries.map((entry: any) =>
      mapper(entry, entriesMap, locale),
    );
  } catch (error) {
    console.error(`Error resolving content type: ${contentType}`, error);
    throw new Error("Failed to process local data file.");
  }
};

export const mapServiceCarousel = (
  entry: any,
  entriesMap: Map<string, any>,
  locale: string,
): ServiceCarouselDto => {
  const v = (field: any) => getLocaleValue(field, locale);

  const serviceLinks = v(entry.fields.services) ?? [];

  return {
    id: entry.sys.id,
    title: v(entry.fields.title),
    services: serviceLinks
      .map((link: any) => entriesMap.get(link.sys.id))
      .filter(Boolean)
      .map((s: any) => {
        const fullService = mapSingleService(s, entriesMap, locale);

        // Remove questions, mainCategory, and baseCategory
        const { questions, mainCategory, baseCategory, ...leanService } =
          fullService;

        return leanService as ServiceDto;
      }),
  };
};
