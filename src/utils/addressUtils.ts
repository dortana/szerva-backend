import { AddressDTO } from "@/types/app";

type MapboxContextItem = {
  id: string;
  text: string;
  short_code?: string;
};

export type MapboxFeature = {
  id: string;
  text: string;
  place_name: string;
  place_type: string[];
  context?: MapboxContextItem[];
  address?: string;
  center: [number, number]; // [longitude, latitude]
};

export const mapboxToAddress = (feature: MapboxFeature): AddressDTO => {
  const context = feature.context ?? [];

  const find = (type: string) => context.find((c) => c.id.startsWith(type));

  const country = find("country");
  const region = find("region");
  const district = find("district");
  const place = find("place");
  const neighborhood = find("neighborhood");
  const postcode = find("postcode");
  const locality = find("locality");

  const [longitude, latitude] = feature.center;

  return {
    id: feature.id,

    addressLine1: feature.address
      ? `${feature.text} ${feature.address}`
      : feature.text,

    addressLine2: neighborhood?.text ?? district?.text ?? undefined,

    city: place?.text ?? locality?.text ?? "",

    state: region?.text ?? "",

    postalCode: postcode?.text ?? "",

    country: country?.text ?? "",
    countryCode: country?.short_code?.toUpperCase() ?? "",

    latitude,
    longitude,
  };
};
