import path from "node:path";
import fs from "node:fs/promises";

const getLocaleValue = (field: any, locale: string) => field?.[locale];

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

const mapCategorySummary = (
  catEntry: any,
  assetsMap: Map<string, any>,
  locale: string,
) => {
  const v = (field: any) => getLocaleValue(field, locale);
  const iconUrl = resolveAssetUrl(v(catEntry.fields.icon), assetsMap, locale);

  return {
    id: catEntry.sys.id,
    title: v(catEntry.fields.title),
    slug: v(catEntry.fields.slug),
    ...(iconUrl !== undefined ? { iconUrl } : {}),
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
  assetsMap: Map<string, any>,
  locale: string,
): any => {
  const v = (field: any) => getLocaleValue(field, locale);

  const rawParent = entriesMap.get(v(entry.fields.parentCategory)?.sys.id);
  const iconUrl = resolveAssetUrl(v(entry.fields.icon), assetsMap, locale);
  const parentCategory = mapCategorySummary(rawParent, assetsMap, locale);

  return {
    id: entry.sys.id,
    title: v(entry.fields.title),
    slug: v(entry.fields.slug),
    ...(iconUrl !== undefined ? { iconUrl } : {}),
    isActive: v(entry.fields.isActive) ?? false,
    ...(parentCategory !== undefined ? { parentCategory } : {}),
  };
};

export const mapSingleService = (
  entry: any,
  entriesMap: Map<string, any>,
  assetsMap: Map<string, any>,
  locale: string,
) => {
  const v = (field: any) => getLocaleValue(field, locale);

  const mainCatRaw = entriesMap.get(v(entry.fields.mainCategory)?.sys.id);
  const baseCatRaw = entriesMap.get(v(entry.fields.baseCategory)?.sys.id);
  const bannerUrl = resolveAssetUrl(v(entry.fields.banner), assetsMap, locale);
  const mainCategory = mapCategorySummary(mainCatRaw, assetsMap, locale);
  const baseCategory = mapCategorySummary(baseCatRaw, assetsMap, locale);

  return {
    id: entry.sys.id,
    title: v(entry.fields.title),
    description: v(entry.fields.description),
    slug: v(entry.fields.slug),
    ...(bannerUrl !== undefined ? { bannerUrl } : {}),
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
  mapper: (
    entry: any,
    entriesMap: Map<string, any>,
    assetsMap: Map<string, any>,
    locale: string,
  ) => T,
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
      mapper(entry, entriesMap, assetsMap, locale),
    );
  } catch (error) {
    console.error(`Error resolving content type: ${contentType}`, error);
    throw new Error("Failed to process local data file.");
  }
};
