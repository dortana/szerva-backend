import {
  Asset,
  Entry,
  EntryFieldTypes,
  EntrySkeletonType,
  UnresolvedLink,
} from "contentful";

export enum ContentType {
  Category = "category",
  Service = "service",
}

export enum QuestionType {
  SINGLE_SELECT = "SINGLE_SELECT",
  MULTI_SELECT = "MULTI_SELECT",
  NUMERICAL_MULTI_SELECT = "NUMERICAL_MULTI_SELECT",
  NUMERICAL_SINGLE_SELECT = "NUMERICAL_SINGLE_SELECT",
  TEXT = "TEXT",
  FILE = "FILE",
  VOICE = "VOICE",
  TIMESTAMP = "TIMESTAMP",
  MOBILE = "MOBILE",
  ADDRESS = "ADDRESS",
  NAME = "NAME",
}

export type ServiceSkeleton = EntrySkeletonType<
  IServiceFields,
  ContentType.Service
>;
export type CategorySkeleton = EntrySkeletonType<
  ICategoryFields,
  ContentType.Category
>;

export type QuestionSkeleton = EntrySkeletonType<IQuestionFields, "question">;

export type OptionSkeleton = EntrySkeletonType<IOptionFields, "option">;

export interface IQuestionFields {
  title: EntryFieldTypes.Text;
  description: EntryFieldTypes.Text;
  helpText?: EntryFieldTypes.RichText;
  questionType: EntryFieldTypes.Symbol<QuestionType>;
  isMandatory: EntryFieldTypes.Boolean;
  minAnswers: EntryFieldTypes.Number;
  maxAnswers: EntryFieldTypes.Number;
  options?: EntryFieldTypes.EntryLink<OptionSkeleton>[];
  // This indicates that this question is only relevant if a specific option from previous question is selected
  requiredParentOption?: EntryFieldTypes.EntryLink<OptionSkeleton>[];
}

export interface IOptionFields {
  title: EntryFieldTypes.Text;
  description?: EntryFieldTypes.Text;
  helpText?: EntryFieldTypes.RichText;
  value: EntryFieldTypes.Text;
  isDefaultAnswer: EntryFieldTypes.Boolean;
  lowerBound?: EntryFieldTypes.Number;
  upperBound?: EntryFieldTypes.Number;
}

export interface IServiceFields {
  title: EntryFieldTypes.Text;
  description: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Symbol;
  jobTitle: EntryFieldTypes.Text;
  icon: EntryFieldTypes.AssetLink;
  banner: EntryFieldTypes.AssetLink;
  agreementFile?: EntryFieldTypes.AssetLink;
  isAgreementNeeded?: EntryFieldTypes.Boolean;
  isActive: EntryFieldTypes.Boolean;
  mainCategory: EntryFieldTypes.EntryLink<CategorySkeleton>;
  baseCategory: EntryFieldTypes.EntryLink<CategorySkeleton>;
  questions?: EntryFieldTypes.EntryLink<QuestionSkeleton>[];
}

export interface ICategoryFields {
  title: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Symbol;
  icon: EntryFieldTypes.AssetLink;
  isActive: EntryFieldTypes.Boolean;
  description?: EntryFieldTypes.Text;
  parentCategory?: EntryFieldTypes.EntryLink<CategorySkeleton>;
}

export const isResolvedAsset = (
  asset: Asset | UnresolvedLink<"Asset"> | undefined,
): asset is Asset => {
  return !!asset && "fields" in asset;
};

export const isResolvedEntry = <TSkeleton extends EntrySkeletonType>(
  entry: Entry<TSkeleton> | UnresolvedLink<"Entry"> | undefined,
): entry is Entry<TSkeleton> => {
  return !!entry && "fields" in entry;
};
