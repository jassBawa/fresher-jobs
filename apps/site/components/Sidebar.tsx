import Link from 'next/link';
import type { Job } from '@jobs/db';
import { AdSlot } from './AdSlot';
import { closesLabel, shortDay, today } from '@/lib/listings';

/**
 * The right column.
 *
 * Ordered by what a returning visitor came for: what shuts soonest, then what
 * is newest, then the channels, then the ad. The ad sits last on purpose —
 * above the fold in a sidebar is still above the fold.
 *
 * The channel buttons render only when their URLs are configured. There is no
 * Telegram or WhatsApp channel yet, and a button that opens nothing is worse
 * than no button: this audience is the target of enough fake job channels
 * already. Set NEXT_PUBLIC_TELEGRAM_URL and NEXT_PUBLIC_WHATSAPP_URL to turn
 * them on.
 */
function Channels() {
	const telegram = process.env.NEXT_PUBLIC_TELEGRAM_URL;
	const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_URL;
	if (!telegram && !whatsapp) return null;

	return (
		<section className="side">
			<h2 className="side__head">Get every opening first</h2>
			<div className="joins">
				{telegram && (
					<a className="join join--tg" href={telegram} target="_blank" rel="noopener noreferrer">
						<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
							<path d="M21.9 4.3 18.6 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1L18 6.6c.4-.4-.1-.6-.6-.2L7.1 13.1l-5-1.6c-1.1-.3-1.1-1 .2-1.5l19.4-7.5c.9-.3 1.7.2 1.4 1.8z" />
						</svg>
						Join our Telegram channel
					</a>
				)}
				{whatsapp && (
					<a className="join join--wa" href={whatsapp} target="_blank" rel="noopener noreferrer">
						<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
							<path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 0 16 8 8 0 0 1-4.1-1.1l-.3-.2-2.6.7.7-2.5-.2-.3A8 8 0 0 1 12 4zm-3 4c-.2 0-.5 0-.7.4-.3.4-.9 1-.9 2.2s.9 2.5 1 2.7c.2.2 1.8 3 4.5 4 2.2.9 2.7.7 3.2.7.5-.1 1.5-.6 1.7-1.3.2-.6.2-1.2.1-1.3l-.6-.3-1.6-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7 7 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.5-.5.3-.5v-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4z" />
						</svg>
						Join our WhatsApp channel
					</a>
				)}
			</div>
		</section>
	);
}

function MiniList({
	title,
	listings,
	href,
	note,
}: {
	title: string;
	listings: Job[];
	href?: string;
	note?: string;
}) {
	const on = today();
	if (!listings.length) return null;

	return (
		<section className="side">
			<h2 className="side__head">{title}</h2>
			{note && <p className="side__note">{note}</p>}
			<ul className="minis">
				{listings.map((j) => (
					<li key={j.slug}>
						<Link href={`/jobs/${j.slug}/`}>
							{j.company} — {j.role}
						</Link>
						<span className="minis__when">{closesLabel(j, on)}</span>
					</li>
				))}
			</ul>
			{href && (
				<Link className="side__all" href={href}>
					See all
				</Link>
			)}
		</section>
	);
}

export function Sidebar({
	closing = [],
	recent = [],
}: {
	closing?: Job[];
	recent?: Job[];
}) {
	const on = today();

	return (
		<aside className="side-col" aria-label="More from PehlaJob">
			<MiniList
				title="Closing this week"
				listings={closing.slice(0, 5)}
				note="Applications shut within seven days."
			/>
			<MiniList title="Latest openings" listings={recent.slice(0, 8)} href="/" />
			<Channels />

			<section className="side side--flat">
				<h2 className="side__head">How this works</h2>
				<p className="side__body">
					Every apply link here is fetched and checked before the listing goes up, and
					again on a schedule. Nothing is published without a person reading it.
					Last check {shortDay(on)}.
				</p>
			</section>

			<AdSlot placement="rail" />
		</aside>
	);
}
