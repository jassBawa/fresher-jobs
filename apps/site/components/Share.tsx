/**
 * Share links for a listing.
 *
 * PRODUCT.md names the WhatsApp forward as a main discovery channel for this
 * audience, so this is a distribution surface rather than decoration — and it
 * is why every listing generates an og:image. The forwarded message carries the
 * company, the role and a preview card, because a bare link in a group chat
 * gets scrolled past.
 *
 * Plain anchors to each network's share endpoint: no SDKs, no third-party
 * script, nothing that reports the reader back to Facebook on page load.
 */
const site = process.env.SITE ?? 'http://localhost:3000';

export function Share({ slug, company, role }: { slug: string; company: string; role: string }) {
	const url = `${site}/jobs/${slug}/`;
	const text = `${company} is hiring — ${role}`;
	const u = encodeURIComponent(url);
	const t = encodeURIComponent(text);

	const links = [
		{
			key: 'wa',
			label: 'WhatsApp',
			href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
			path: 'M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 0 16 8 8 0 0 1-4.1-1.1l-.3-.2-2.6.7.7-2.5-.2-.3A8 8 0 0 1 12 4zm-3 4c-.2 0-.5 0-.7.4-.3.4-.9 1-.9 2.2s.9 2.5 1 2.7c.2.2 1.8 3 4.5 4 2.2.9 2.7.7 3.2.7.5-.1 1.5-.6 1.7-1.3.2-.6.2-1.2.1-1.3l-.6-.3-1.6-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7 7 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.5-.5.3-.5v-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4z',
		},
		{
			key: 'tg',
			label: 'Telegram',
			href: `https://t.me/share/url?url=${u}&text=${t}`,
			path: 'M21.9 4.3 18.6 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1L18 6.6c.4-.4-.1-.6-.6-.2L7.1 13.1l-5-1.6c-1.1-.3-1.1-1 .2-1.5l19.4-7.5c.9-.3 1.7.2 1.4 1.8z',
		},
		{
			key: 'li',
			label: 'LinkedIn',
			href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
			path: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C20.6 8.65 21 11 21 14.1V21h-4v-6.1c0-1.45-.03-3.3-2-3.3-2.01 0-2.32 1.57-2.32 3.2V21H9z',
		},
	];

	return (
		<div className="share">
			<span className="share__label">Send to a friend</span>
			<ul className="share__list">
				{links.map((l) => (
					<li key={l.key}>
						<a
							className={`share__btn share__btn--${l.key}`}
							href={l.href}
							target="_blank"
							rel="noopener noreferrer nofollow"
						>
							<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
								<path d={l.path} />
							</svg>
							{l.label}
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}
