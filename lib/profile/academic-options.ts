export const SCHOOL_OPTIONS = [
  "School of Engineering and Digital Sciences",
  "School of Sciences and Humanities",
  "School of Mining and Geosciences",
  "School of Medicine",
  "Graduate School of Business",
  "Graduate School of Education",
  "Graduate School of Public Policy",
] as const;

export const MAJOR_OPTIONS = [
  "Computer Science",
  "Data Science",
  "Electrical and Computer Engineering",
  "Mechanical Engineering",
  "Chemical Engineering",
  "Civil Engineering",
  "Mathematics",
  "Physics",
  "Biology",
  "Economics",
  "Political Science and International Relations",
  "Anthropology",
  "Sociology",
  "Medicine",
  "Public Policy",
  "Business Administration",
] as const;

export const YEAR_LABEL_OPTIONS = [
  "Foundation",
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Master's",
  "PhD",
  "Alumni",
] as const;

export type SelectOption = {
  value: string;
  label: string;
};

export function toSelectOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

export function withLegacyValue(options: SelectOption[], value: string | null | undefined): SelectOption[] {
  const normalized = value?.trim();
  if (!normalized) {
    return options;
  }

  if (options.some((option) => option.value === normalized)) {
    return options;
  }

  return [{ value: normalized, label: `${normalized} (current)` }, ...options];
}

