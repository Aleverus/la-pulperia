import Form from "next/form";
import { IconChevronDown, IconFilter, IconSearch } from "@tabler/icons-react";
import type {
  SearchAvailabilityFilter,
  SearchOfferClassFilter,
  SearchPresenceFilter,
  SearchSort,
} from "@/lib/search";

export function SearchForm({
  defaultQuery = "",
  defaultOfferClass = "all",
  defaultPresence = "all",
  defaultAvailability = "all",
  defaultSort = "organic",
  locationActive = false,
}: {
  defaultQuery?: string;
  defaultOfferClass?: SearchOfferClassFilter;
  defaultPresence?: SearchPresenceFilter;
  defaultAvailability?: SearchAvailabilityFilter;
  defaultSort?: SearchSort;
  locationActive?: boolean;
}) {
  const formKey = [
    defaultQuery,
    defaultOfferClass,
    defaultPresence,
    defaultAvailability,
    defaultSort,
    locationActive ? "located" : "unlocated",
  ].join("|");
  const hasActiveFilters =
    defaultOfferClass !== "all" ||
    defaultPresence !== "all" ||
    defaultAvailability !== "all" ||
    defaultSort !== "organic";

  return (
    <Form
      key={formKey}
      action="/buscar"
      role="search"
      className="search-form"
    >
      <label className="form-field form-field--query" htmlFor="q">
        <span>¿Qué necesitás encontrar?</span>
        <input
          id="q"
          name="q"
          defaultValue={defaultQuery}
          placeholder="zambos picantes"
        />
      </label>
      <details className="search-form__filter-panel">
        <summary>
          <IconFilter aria-hidden="true" size={18} stroke={1.8} />
          {hasActiveFilters ? "Filtros activos" : "Filtros"}
        </summary>
        <div className="search-form__filters">
          <label className="form-field form-field--filter" htmlFor="clase">
            <span>Clase de oferta</span>
            <select id="clase" name="clase" defaultValue={defaultOfferClass}>
              <option value="all">Todas</option>
              <option value="stocked_product">Producto con stock</option>
              <option value="scheduled_food">Comida o encargo</option>
              <option value="local_service">Servicio local</option>
              <option value="digital_offer">Oferta digital</option>
            </select>
            <IconChevronDown
              className="filter-chevron"
              aria-hidden="true"
              size={15}
              stroke={2}
            />
          </label>
          <label className="form-field form-field--filter" htmlFor="tipo">
            <span>Forma de atención</span>
            <select id="tipo" name="tipo" defaultValue={defaultPresence}>
              <option value="all">Todas</option>
              <option value="fixed_location">Ubicación fija</option>
              <option value="mobile">Atención móvil</option>
              <option value="remote">Atención remota</option>
            </select>
            <IconChevronDown
              className="filter-chevron"
              aria-hidden="true"
              size={15}
              stroke={2}
            />
          </label>
          <label className="form-field form-field--filter" htmlFor="disponibilidad">
            <span>Disponibilidad publicada</span>
            <select
              id="disponibilidad"
              name="disponibilidad"
              defaultValue={defaultAvailability}
            >
              <option value="all">Cualquiera</option>
              <option value="available">Disponible</option>
              <option value="limited">Limitada</option>
              <option value="on_request">Bajo solicitud</option>
            </select>
            <IconChevronDown
              className="filter-chevron"
              aria-hidden="true"
              size={15}
              stroke={2}
            />
          </label>
          <label className="form-field form-field--filter" htmlFor="orden">
            <span>Ordenar por</span>
            <select id="orden" name="orden" defaultValue={defaultSort}>
              <option value="organic">Relevancia</option>
              <option value="recent">Más reciente</option>
              {locationActive ? (
                <option value="nearby">Más cerca de mí</option>
              ) : null}
            </select>
            <IconChevronDown
              className="filter-chevron"
              aria-hidden="true"
              size={15}
              stroke={2}
            />
          </label>
        </div>
      </details>
      <button type="submit" className="search-form__submit">
        <IconSearch aria-hidden="true" size={22} stroke={2} />
        Buscar
      </button>
    </Form>
  );
}
