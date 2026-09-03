import Image from "next/image";
import { IconCamera, IconCircleCheck } from "@tabler/icons-react";
import { updateAccountProfileAction } from "@/app/account-actions";

export type AccountAvatarChoice = {
  id: string;
  storagePath: string;
  src: string;
  alt: string;
};

export function AccountProfileSettings({
  email,
  displayName,
  initial,
  avatarSrc,
  selectedAvatarPath,
  media,
}: {
  email: string;
  displayName: string;
  initial: string;
  avatarSrc: string | null;
  selectedAvatarPath: string | null;
  media: AccountAvatarChoice[];
}) {
  return (
    <section className="account-profile-panel" aria-labelledby="profile-settings-title">
      <div className="account-profile-panel__heading">
        <div className="account-avatar-preview">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt=""
              width={112}
              height={112}
              sizes="112px"
            />
          ) : (
            <span aria-hidden="true">{initial}</span>
          )}
          <span className="account-avatar-preview__edit" aria-hidden="true">
            <IconCamera size={17} stroke={2} />
          </span>
        </div>
        <div>
          <p className="eyebrow">Perfil</p>
          <h2 id="profile-settings-title">Tu información</h2>
          <p className="account-identity">{email}</p>
        </div>
      </div>

      <form action={updateAccountProfileAction} className="account-profile-form">
        <label className="form-field" htmlFor="account-display-name">
          <span>Nombre visible</span>
          <input
            id="account-display-name"
            name="display_name"
            defaultValue={displayName}
            minLength={1}
            maxLength={80}
            required
          />
          <small>Este nombre identifica tu perfil dentro de La Pulpería.</small>
        </label>

        <fieldset className="account-avatar-fieldset">
          <legend>Foto del perfil</legend>
          <p>
            Elegí una imagen de tus publicaciones. Si todavía no tenés una,
            usaremos tu inicial con los colores de La Pulpería.
          </p>
          <div className="account-avatar-choices">
            <label className="account-avatar-choice">
              <input
                type="radio"
                name="avatar_path"
                value=""
                defaultChecked={!selectedAvatarPath}
              />
              <span className="account-avatar-choice__image is-initial" aria-hidden="true">
                {initial}
              </span>
              <span>Usar mi inicial</span>
              <IconCircleCheck
                className="account-avatar-choice__check"
                aria-hidden="true"
                size={20}
                stroke={2}
              />
            </label>
            {media.map((item, index) => (
              <label className="account-avatar-choice" key={item.id}>
                <input
                  type="radio"
                  name="avatar_path"
                  value={item.storagePath}
                  defaultChecked={selectedAvatarPath === item.storagePath}
                />
                <span className="account-avatar-choice__image">
                  <Image
                    src={item.src}
                    alt={item.alt || `Foto ${index + 1} de tus publicaciones`}
                    width={96}
                    height={96}
                    sizes="96px"
                  />
                </span>
                <span>Foto {index + 1}</span>
                <IconCircleCheck
                  className="account-avatar-choice__check"
                  aria-hidden="true"
                  size={20}
                  stroke={2}
                />
              </label>
            ))}
          </div>
          {media.length === 0 ? (
            <p className="account-avatar-empty">
              Cuando agregués fotos a una publicación, aparecerán aquí para
              que elijás una.
            </p>
          ) : null}
        </fieldset>

        <button type="submit" className="primary-action account-profile-save">
          Guardar perfil
        </button>
      </form>
    </section>
  );
}
