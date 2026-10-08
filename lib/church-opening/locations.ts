import { Country, State } from 'country-state-city';

const countries = Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name, 'en'));
export const COUNTRY_OPTIONS = countries.map(({ name }) => ({ value: name, label: name }));

/** Province/state names are stored so existing submissions remain readable. */
export function getProvinceOptions(countryName: string) {
  const country = countries.find(({ name }) => name === countryName);
  if (!country) return [];
  const provinces = State.getStatesOfCountry(country.isoCode)
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .map(({ name }) => ({ value: name, label: name }));
  return provinces.length ? provinces : [{ value: 'Not applicable', label: 'Not applicable' }];
}
