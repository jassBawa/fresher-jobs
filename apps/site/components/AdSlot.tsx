/**
 * A reserved advertising slot.
 *
 * AdSense is not approved yet, so nothing renders inside this — but the height
 * is reserved now, at the size the eventual unit will occupy, so adding the
 * script later fills space that already exists and Cumulative Layout Shift
 * stays at zero. Retrofitting the reservation afterwards is how a site ends up
 * with content that jumps under the reader's thumb mid-sentence.
 *
 * Two rules this component exists to enforce: never above the first content
 * block, so an ad can never be the LCP element; and manual units only, because
 * Auto Ads decide placement at runtime, which is exactly the instability being
 * designed out.
 */
type Placement = 'feed' | 'foot' | 'rail';

const UNIT: Record<Placement, string | undefined> = {
	feed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED,
	foot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOT,
	rail: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RAIL,
};

export function AdSlot({ placement, unit }: { placement: Placement; unit?: string }) {
	const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
	const slot = unit ?? UNIT[placement];
	const live = Boolean(client && slot);

	return (
		<aside className={`ad ad--${placement}`} aria-label="Advertisement" data-slot={placement}>
			{live ? (
				<ins
					className="adsbygoogle ad__inner"
					style={{ display: 'block' }}
					data-ad-client={client}
					data-ad-slot={slot}
					data-full-width-responsive="false"
				/>
			) : (
				<span className="ad__inner" />
			)}
		</aside>
	);
}
