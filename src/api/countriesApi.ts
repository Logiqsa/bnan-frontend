export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

interface RestCountry {
  alpha2Code: string;
  flag?: string;
  name?: string;
}

const COUNTRIES_API_URL = "https://countries.dev/countries?fields=name,alpha2Code,flag";

export async function getCountries(signal?: AbortSignal): Promise<CountryOption[]> {
  const response = await fetch(COUNTRIES_API_URL, { signal });
  if (!response.ok) throw new Error("تعذر تحميل قائمة الدول.");
  const payload = await response.json() as RestCountry[];
  const displayNames = new Intl.DisplayNames(["ar"], { type: "region" });
  return payload
    .filter(country => country.alpha2Code)
    .map(country => ({
      code: country.alpha2Code,
      name: displayNames.of(country.alpha2Code) || country.name || country.alpha2Code,
      flag: country.flag || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}
