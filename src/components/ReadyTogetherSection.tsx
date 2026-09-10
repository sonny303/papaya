export function ReadyTogetherSection() {
  return (
    <section aria-labelledby="ready-together-heading" className="ready-section">
      <div className="home-container">
        <div className="ready-panel">
          <figure className="ready-photo">
            <picture>
              <source
                type="image/avif"
                srcSet="/assets/planning-board-640.avif 640w, /assets/planning-board-768.avif 768w, /assets/planning-board-960.avif 960w, /assets/planning-board-1448.avif 1448w"
                sizes="(min-width: 1024px) 604px, (min-width: 768px) calc(100vw - 48px), calc(100vw - 32px)"
              />
              <source
                type="image/webp"
                srcSet="/assets/planning-board-640.webp 640w, /assets/planning-board-768.webp 768w, /assets/planning-board-960.webp 960w, /assets/planning-board-1448.webp 1448w"
                sizes="(min-width: 1024px) 604px, (min-width: 768px) calc(100vw - 48px), calc(100vw - 32px)"
              />
              <img
                src="/assets/planning-board.jpg"
                alt="Two partners in rust and cream planning together at a laptop and planning board"
                className="absolute inset-0 size-full object-cover"
                width="1448"
                height="965"
                loading="lazy"
                decoding="async"
              />
            </picture>
          </figure>
          <div className="ready-copy">
            <p className="home-eyebrow">Prepare in your own way</p>
            <h2 id="ready-together-heading" className="ready-heading">
              Less scattered.
              <br />
              Less alone. More ready.
            </h2>
            <p className="ready-body">
              Your pre-pregnancy, organized around you — and the people
              preparing alongside you.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
