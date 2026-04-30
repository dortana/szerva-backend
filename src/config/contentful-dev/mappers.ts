import { Asset, Entry, UnresolvedLink } from "contentful";
import {
  CategorySkeleton,
  OptionSkeleton,
  QuestionSkeleton,
  ServiceSkeleton,
  isResolvedEntry,
} from "./types";

/* ------------------ helpers ------------------ */

const assetToUrl = (
  asset: Asset | UnresolvedLink<"Asset"> | undefined,
): string | undefined => {
  if (!asset || !("fields" in asset)) return undefined;
  return asset.fields.file?.url ? `https:${asset.fields.file.url}` : undefined;
};

/* ------------------ mappers ------------------ */

export const mapCategory = (
  entry: Entry<CategorySkeleton, undefined, string>,
) => {
  const parent = isResolvedEntry(entry.fields.parentCategory)
    ? entry.fields.parentCategory
    : undefined;

  return {
    id: entry.sys.id,
    title: entry.fields.title,
    slug: entry.fields.slug,
    iconUrl: assetToUrl(entry.fields.icon),
    isActive: entry.fields.isActive,
    //@ts-ignore
    parentCategory: parent
      ? {
          id: parent.sys.id,
          title: parent.fields.title,
          slug: parent.fields.slug,
          iconUrl: assetToUrl(parent.fields.icon),
          isActive: parent.fields.isActive,
        }
      : undefined,
  };
};

const mapOption = (entry: Entry<OptionSkeleton, undefined, string>) => ({
  id: entry.sys.id,
  title: entry.fields.title,
  value: entry.fields.value,
  isDefaultAnswer: entry.fields.isDefaultAnswer,
});

const mapQuestion = (entry: Entry<QuestionSkeleton, undefined, string>) => ({
  id: entry.sys.id,
  title: entry.fields.title,
  description: entry.fields.description,
  questionType: entry.fields.questionType,
  isMandatory: entry.fields.isMandatory,
  minAnswers: entry.fields.minAnswers,
  maxAnswers: entry.fields.maxAnswers,
  options: (entry.fields.options ?? []).filter(isResolvedEntry).map(mapOption),
  requiredParentOptionIds: (entry.fields.requiredParentOption ?? [])
    .filter(isResolvedEntry)
    //@ts-ignore
    .map((o) => o.sys.id),
});

export const mapServiceBulk = (
  entry: Entry<ServiceSkeleton, undefined, string>,
) => {
  if (
    !isResolvedEntry(entry.fields.mainCategory) ||
    !isResolvedEntry(entry.fields.baseCategory)
  ) {
    throw new Error("Service entry has unresolved categories");
  }
  return {
    id: entry.sys.id,
    title: entry.fields.title,
    description: entry.fields.description,
    slug: entry.fields.slug,
    jobTitle: entry.fields.jobTitle,
    iconUrl: assetToUrl(entry.fields.icon),
    isAgreementNeeded: entry.fields.isAgreementNeeded,
    isActive: entry.fields.isActive,
    mainCategory: { slug: entry.fields.mainCategory.fields.slug },
    baseCategory: { slug: entry.fields.baseCategory.fields.slug },
  };
};

export const mapSingleService = (
  entry: Entry<ServiceSkeleton, undefined, string>,
) => {
  if (
    !isResolvedEntry(entry.fields.mainCategory) ||
    !isResolvedEntry(entry.fields.baseCategory)
  ) {
    throw new Error("Service entry has unresolved categories");
  }

  return {
    id: entry.sys.id,
    title: entry.fields.title,
    description: entry.fields.description,
    slug: entry.fields.slug,
    bannerUrl: assetToUrl(entry.fields.banner),
    isAgreementNeeded: entry.fields.isAgreementNeeded,
    isActive: entry.fields.isActive,
    mainCategory: mapCategory(entry.fields.mainCategory),
    baseCategory: mapCategory(entry.fields.baseCategory),
    questions: (entry.fields.questions ?? [])
      .filter(isResolvedEntry)
      .map(mapQuestion),
  };
};

export const mapCategoriesResult = (
  entries: Entry<CategorySkeleton, undefined, string>[],
) => entries.map(mapCategory);

export const mapServicesResult = (
  entries: Entry<ServiceSkeleton, undefined, string>[],
) => entries.map(mapServiceBulk);

export const mapServicesSingleResult = (
  entries: Entry<ServiceSkeleton, undefined, string>[],
) => entries.map(mapSingleService);
