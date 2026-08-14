import { ImageResponse } from 'next/og';
import { listingBySlug } from '@/lib/db';
import { jobCard, fallbackCard, SHAPES } from '@/lib/thumb';

/**
 * The share card. 1.91:1, because that is the crop every messaging preview
 * expects — see lib/thumb.tsx for why the feed uses a different shape.
 */
export const alt = 'Job details';
export const size = SHAPES.wide;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const job = await listingBySlug(slug);
	return new ImageResponse(job ? jobCard(job, 'wide') : fallbackCard('wide'), size);
}
