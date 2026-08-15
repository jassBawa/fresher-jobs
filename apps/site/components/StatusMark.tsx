import type { ListingStatus } from '@/lib/listings';

/**
 * Status as a drawn mark plus a word.
 *
 * Colour never carries the meaning on its own: the reader may be on a cheap
 * panel in daylight, or colourblind, and "is this still open" is the single
 * fact the whole page exists to answer. Three glyphs, one stroke weight, one
 * grid — a filled disc, a disc losing its ring, a struck circle.
 */
const WORD: Record<ListingStatus, string> = {
	open: 'Open',
	closing: 'Closing',
	closed: 'Closed',
};

export function StatusMark({ status, label }: { status: ListingStatus; label?: string }) {
	return (
		<span className={`mark mark--${status === 'closing' ? 'soon' : status}`}>
			<svg viewBox="0 0 16 16" aria-hidden="true" fill="none">
				{status === 'open' && <circle cx="8" cy="8" r="6" fill="currentColor" />}
				{status === 'closing' && (
					<>
						<circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
						<path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
					</>
				)}
				{status === 'closed' && (
					<>
						<circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
						<path d="M4.8 11.2 11.2 4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
					</>
				)}
			</svg>
			{label ?? WORD[status]}
		</span>
	);
}
