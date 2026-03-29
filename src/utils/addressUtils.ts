import { AddressDTO } from "@/types/app";

type MapboxContextItem = {
  id: string;
  text: string;
  short_code: string;
};

export type MapboxFeature = {
  id: string;
  text: string;
  place_name: string;
  place_type: string[];
  context?: MapboxContextItem[];
  address?: string;
};

export const mapboxToAddress = (feature: MapboxFeature): AddressDTO => {
  const context = feature.context ?? [];

  const find = (type: string) => context.find((c) => c.id.startsWith(type));

  const country = find("country");

  const district = find("neighborhood")?.text ?? find("district")?.text;

  return {
    id: feature.id,
    addressLine1: feature.address
      ? `${feature.text} ${feature.address}`
      : feature.text,

    addressLine2: district ?? "",

    city: find("place")?.text ?? "",
    state: find("region")?.text ?? "",
    postalCode: find("postcode")?.text ?? "",

    country: country?.text ?? "",
    countryCode: country?.short_code?.toUpperCase() ?? "",
  };
};
