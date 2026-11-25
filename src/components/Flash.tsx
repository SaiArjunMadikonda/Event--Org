import { Icon } from "./Icon";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function Flash({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  return (
    <>
      {error && (
        <div className="flash error" role="alert">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flash notice" role="status">
          <Icon name="check" />
          <span>{notice}</span>
        </div>
      )}
    </>
  );
}
