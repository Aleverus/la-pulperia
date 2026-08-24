import type { SearchPresenceFilter, SearchSort } from "@/lib/search";

export function SearchForm({
  defaultQuery = "",
  defaultPresence = "all",
  defaultSort = "organic",
  locationActive = false,
}: {
  defaultQuery?: string;
  defaultPresence?: SearchPresenceFilter;
  defaultSort?: SearchSort;
  locationActive?: boolean;
}) {
  return (
    <form action="/buscar" method="get" role="search">
      <label className="form-field" htmlFor="q">
        Qué buscás
        <input
          id="q"
          name="q"
          defaultValue={defaultQuery}
          placeholder="zambos picantes"
        />
      </label>
      <label className="form-field" htmlFor="tipo">
        Tipo de pulpería
        <select id="tipo" name="tipo" defaultValue={defaultPresence}>
          <option value="all">Todas</option>
          <option value="physical">Físicas</option>
          <option value="virtual">Virtuales</option>
        </select>
      </label>
      <label className="form-field" htmlFor="orden">
        Ordenar por
        <select id="orden" name="orden" defaultValue={defaultSort}>
          <option value="organic">Recomendado</option>
          <option value="price_asc">Precio: menor primero</option>
          <option value="price_desc">Precio: mayor primero</option>
          <option value="recent">Confirmación más reciente</option>
          {locationActive ? <option value="nearby">Más cerca de mí</option> : null}
        </select>
      </label>
      <button type="submit">Buscar</button>
    </form>
  );
}
