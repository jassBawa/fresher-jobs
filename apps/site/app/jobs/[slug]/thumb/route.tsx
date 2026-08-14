import { ImageResponse } from 'next/og';
import { listingBySlug } from '@/lib/db';
import { jobCard, fallbackCard, SHAPES } from '@/lib/thumb';

/**
 * The feed thumbnail. 4:3, so it nearly fills a card's height and the browser
 * has almost nothing to crop.
 *
 * Cached hard and immutably: the drawing only changes when the listing's facts
 * change, and a changed listing gets a fresh build. Without this every card in
 * the feed would re-render satori on each request.
 */
export const revalidate = 900;

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string }> }
) {
	const { slug } = await params;
	const job = await listingBySlug(slug);

	return new ImageResponse(job ? jobCard(job, 'feed') : fallbackCard('feed'), {
		...SHAPES.feed,
		headers: { 'cache-control': 'public, max-age=900, stale-while-revalidate=86400' },
	});
}
