export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function Flash({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  return (
    <>
      {error && <div className="flash error" role="alert">{error}</div>}
      {notice && <div className="flash notice" role="status">{notice}</div>}
    </>
  );
}
