import {
  confirmOfferAction,
  removeOfferImageAction,
  saveOfferAction,
  setOfferStatusAction,
} from "@/app/seller-actions";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
import { mediaPublicUrl } from "@/lib/seller-data";
import type { OwnedMedia, OwnedOffer } from "@/lib/seller";

export function OfferForm({
  offer,
  media,
  error,
  notice,
}: {
  offer: OwnedOffer | null;
  media: OwnedMedia[];
  error?: string;
  notice?: string;
}) {
  const priceDefault = offer
    ? (offer.price_cents / 100).toFixed(2)
    : "";

  return (
    <div className="stack">
      <form action={saveOfferAction} className="stack">
        <input type="hidden" name="offer_id" value={offer?.id ?? ""} />
        <label htmlFor="offer-title">Título</label>
        <input
          id="offer-title"
          name="title"
          defaultValue={offer?.title ?? ""}
          required
          maxLength={120}
        />

        <label htmlFor="offer-description">Descripción</label>
        <textarea
          id="offer-description"
          name="description"
          defaultValue={offer?.description ?? ""}
          maxLength={4000}
          rows={4}
        />

        <label htmlFor="offer-kind">Tipo</label>
        <select id="offer-kind" name="kind" defaultValue={offer?.kind ?? "product"}>
          <option value="product">Producto</option>
          <option value="service">Servicio</option>
        </select>

        <label htmlFor="offer-price">Precio publicado (lempiras)</label>
        <input
          id="offer-price"
          name="price"
          inputMode="decimal"
          defaultValue={priceDefault}
          required
        />

        <label htmlFor="offer-price-mode">Modalidad</label>
        <select
          id="offer-price-mode"
          name="price_mode"
          defaultValue={offer?.price_mode ?? "fixed"}
        >
          <option value="fixed">Precio fijo</option>
          <option value="from">Desde</option>
        </select>

        <label htmlFor="offer-unit">Unidad (opcional)</label>
        <input
          id="offer-unit"
          name="unit"
          defaultValue={offer?.unit ?? ""}
          maxLength={40}
        />

        <label htmlFor="offer-availability">Disponibilidad</label>
        <select
          id="offer-availability"
          name="availability"
          defaultValue={offer?.availability ?? "available"}
        >
          <option value="available">Disponible</option>
          <option value="limited">Limitada</option>
          <option value="unavailable">No disponible</option>
        </select>

        <input type="hidden" name="status" value={offer?.status ?? "draft"} />

        {offer ? (
          <>
            <label htmlFor="offer-image">Foto (opcional, máximo 4)</label>
            <input
              id="offer-image"
              name="image"
              type="file"
              accept="image/*"
              disabled={media.length >= 4}
            />
          </>
        ) : null}

        {error ? <p>{error}</p> : null}
        {notice ? <p>{notice}</p> : null}

        <button type="submit">{offer ? "Guardar cambios" : "Crear oferta"}</button>
      </form>

      {offer ? (
        <>
          <p>
            {FRESHNESS_LABEL[freshnessBand(new Date(offer.confirmed_at))]} ·{" "}
            {offer.status}
          </p>
          <form action={confirmOfferAction}>
            <input type="hidden" name="offer_id" value={offer.id} />
            <button type="submit">Confirmar vigencia</button>
          </form>
          <div>
            {offer.status !== "published" ? (
              <StatusButton offerId={offer.id} status="published" label="Publicar" />
            ) : null}
            {offer.status === "published" ? (
              <StatusButton offerId={offer.id} status="paused" label="Pausar" />
            ) : null}
            {offer.status === "paused" ? (
              <StatusButton
                offerId={offer.id}
                status="published"
                label="Volver a publicar"
              />
            ) : null}
            {offer.status !== "archived" ? (
              <StatusButton offerId={offer.id} status="archived" label="Archivar" />
            ) : (
              <StatusButton
                offerId={offer.id}
                status="draft"
                label="Sacar del archivo"
              />
            )}
          </div>
          {media.length > 0 ? (
            <ul className="offer-list">
              {media.map((item) => {
                const src = mediaPublicUrl(item.storage_path);
                return (
                  <li key={item.id}>
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={item.alt_text || "Foto de la oferta"} />
                    ) : null}
                    <form action={removeOfferImageAction}>
                      <input type="hidden" name="offer_id" value={offer.id} />
                      <input type="hidden" name="media_id" value={item.id} />
                      <button type="submit">Quitar foto</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : (
        <p>Primero creá la oferta. Las fotos se agregan al editarla.</p>
      )}
    </div>
  );
}

function StatusButton({
  offerId,
  status,
  label,
}: {
  offerId: string;
  status: "draft" | "published" | "paused" | "archived";
  label: string;
}) {
  return (
    <form action={setOfferStatusAction} style={{ display: "inline" }}>
      <input type="hidden" name="offer_id" value={offerId} />
      <input type="hidden" name="status" value={status} />
      <button type="submit">{label}</button>
    </form>
  );
}
