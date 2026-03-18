"use client";

import { useEffect, useState } from "react";

type ListingType = "sale" | "rental" | "service";
type PricingModel = "fixed" | "per_day" | "per_week" | "per_month" | "per_hour" | "starting_from";

const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  sale: "Sale",
  rental: "Rental",
  service: "Service",
};

const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  fixed: "Fixed",
  per_day: "Per day",
  per_week: "Per week",
  per_month: "Per month",
  per_hour: "Per hour",
  starting_from: "Starting from",
};

const PRICING_MODELS_BY_LISTING_TYPE: Record<ListingType, readonly PricingModel[]> = {
  sale: ["fixed"],
  rental: ["per_day", "per_week", "per_month"],
  service: ["fixed", "per_hour", "starting_from"],
};

function isListingType(value: string | null | undefined): value is ListingType {
  return value === "sale" || value === "rental" || value === "service";
}

function isPricingModel(value: string | null | undefined): value is PricingModel {
  return (
    value === "fixed"
    || value === "per_day"
    || value === "per_week"
    || value === "per_month"
    || value === "per_hour"
    || value === "starting_from"
  );
}

type ListingTypePricingFieldsProps = {
  initialListingType?: string | null;
  initialPricingModel?: string | null;
};

export function ListingTypePricingFields({
  initialListingType,
  initialPricingModel,
}: ListingTypePricingFieldsProps) {
  const defaultListingType: ListingType = isListingType(initialListingType)
    ? initialListingType
    : "sale";
  const allowedInitialPricingModels = PRICING_MODELS_BY_LISTING_TYPE[defaultListingType];
  const normalizedInitialPricingModel: PricingModel = isPricingModel(initialPricingModel)
    ? initialPricingModel
    : "fixed";
  const defaultPricingModel = allowedInitialPricingModels.includes(normalizedInitialPricingModel)
    ? normalizedInitialPricingModel
    : allowedInitialPricingModels[0];

  const [listingType, setListingType] = useState<ListingType>(defaultListingType);
  const [pricingModel, setPricingModel] = useState<PricingModel>(defaultPricingModel);

  const allowedPricingModels = PRICING_MODELS_BY_LISTING_TYPE[listingType];

  useEffect(() => {
    if (!allowedPricingModels.includes(pricingModel)) {
      setPricingModel(allowedPricingModels[0]);
    }
  }, [allowedPricingModels, pricingModel]);

  return (
    <>
      <label className="block space-y-2">
        <span className="wire-label">Listing type</span>
        <select
          name="listingType"
          required
          className="wire-input-field"
          value={listingType}
          onChange={(event) => setListingType(event.currentTarget.value as ListingType)}
        >
          {(Object.keys(LISTING_TYPE_LABELS) as ListingType[]).map((value) => (
            <option key={value} value={value}>
              {LISTING_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="wire-label">Pricing model</span>
        <select
          name="pricingModel"
          required
          className="wire-input-field"
          value={pricingModel}
          onChange={(event) => setPricingModel(event.currentTarget.value as PricingModel)}
        >
          {allowedPricingModels.map((value) => (
            <option key={value} value={value}>
              {PRICING_MODEL_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
