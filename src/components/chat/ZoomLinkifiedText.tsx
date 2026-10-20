const OFFICIAL_ZOOM_LINK = /^https?:\/\/(?:[a-z0-9-]+\.)*zoom\.us(?:\/[^\s<>"']*)?$/i;
const OFFICIAL_ZOOM_LINK_SPLIT = /(https?:\/\/(?:[a-z0-9-]+\.)*zoom\.us(?:\/[^\s<>"']*)?)/gi;

export default function ZoomLinkifiedText({ text }: { text: string }) {
  return (
    <>
      {text.split(OFFICIAL_ZOOM_LINK_SPLIT).map((part, index) =>
        OFFICIAL_ZOOM_LINK.test(part) ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all underline underline-offset-2 hover:opacity-80"
          >
            {part}
          </a>
        ) : part,
      )}
    </>
  );
}
