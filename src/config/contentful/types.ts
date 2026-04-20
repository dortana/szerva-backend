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

export type CategoryDto = {
  id: string;
  title: string;
  slug: string;
  iconUrl?: string;
  isActive: boolean;
  parentCategory?: CategoryDto;
};

export type OptionDto = {
  id: string;
  title: string;
  value: string;
  isDefaultAnswer: boolean;
};

export type QuestionDto = {
  id: string;
  title: string;
  description: string;
  questionType: string;
  isMandatory: boolean;
  minAnswers: number;
  maxAnswers: number;
  options?: OptionDto[];
  requiredParentOptionIds?: string[];
};

export type ServiceDto = {
  id: string;
  title: string;
  description: string;
  slug: string;
  bannerUrl?: string;
  isAgreementNeeded?: boolean;
  isActive: boolean;

  mainCategory: CategoryDto;
  baseCategory: CategoryDto;

  questions: QuestionDto[];
};
