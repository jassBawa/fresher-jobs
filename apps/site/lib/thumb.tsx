import type { Job } from '@jobs/db';
import { payLabel } from '@/lib/listings';

/**
 * The generated job card, at whatever shape the caller needs.
 *
 * The reference site hand-makes one of these per posting in a graphics tool.
 * Every field on it — company, role, batch, salary, location — is already a
 * column here, so it can be rendered instead of drawn: it exists for every
 * listing, it updates when the facts do, and it costs nobody an afternoon in
 * Canva.
 *
 * Two callers, two shapes, one template:
 *
 *   - `wide` (1200×630) is the og:image. PRODUCT.md calls WhatsApp forwards a
 *     main discovery channel, and every preview crop expects 1.91:1.
 *   - `feed` (800×600) is the thumbnail beside each card. 4:3 nearly fills the
 *     card's height, so the browser barely has to crop it — the wide one lost
 *     a third of its width to `object-fit: cover` and cut the company name in
 *     half at both ends.
 *
 * Both are laid out in proportional units off `s`, so the two shapes are the
 * same drawing at two scales rather than two drawings to keep in sync.
 */
const INK = '#0f1720';
const NAVY = '#13224b';
const NAVY_SOFT = '#93b4e8';
const GREEN = '#0b6b35';
const RULE = '#dce2e8';
const MUTED = '#5b6672';

export const SHAPES = {
	wide: { width: 1200, height: 630 },
	feed: { width: 800, height: 600 },
} as const;

export type Shape = keyof typeof SHAPES;

/**
 * Long names step down a little and then wrap, rather than shrinking to fit on
 * one line. "Siemens EDA (India) Private Limited" on a single line is a
 * whisper at feed size; over two lines it still reads.
 */
const fit = (text: string, max: number, min: number, ideal: number): number =>
	text.length <= ideal ? max : Math.max(min, Math.round((max * ideal) / text.length));

export function fallbackCard(shape: Shape) {
	const { width } = SHAPES[shape];
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				background: NAVY,
				color: '#fff',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: width * 0.06,
				fontWeight: 800,
				fontFamily: 'sans-serif',
			}}
		>
			PehlaJob
		</div>
	);
}

export function jobCard(job: Job, shape: Shape) {
	const { width } = SHAPES[shape];
	/* One scale factor drives every dimension, so `feed` is `wide` redrawn
	   rather than re-specified. */
	const s = width / 1200;
	/* Type gets a second multiplier on the feed shape. The share card is viewed
	   near full size; the feed thumbnail is drawn at 800px and displayed at
	   ~320, so text scaled purely by `s` arrives at 8px and is decoration
	   rather than information. */
	const t = shape === 'feed' ? s * 1.35 : s;
	/* Generous side padding is not decoration: the feed thumbnail is cropped by
	   `object-fit: cover` to whatever height the card body ends up, so the text
	   needs room to survive losing a slice of either edge. */
	const pad = Math.round(88 * s);
	const rowSize = Math.round(31 * t);

	const where = (job.cities.length ? job.cities : job.locations).slice(0, 2).join(', ');
	const rows: [string, string][] = (
		[
			['Batch', job.batchYears.slice(0, 4).join(', ')],
			['Salary', payLabel(job.salary)],
			['Location', where],
			['Qualification', job.qualifications[0] ?? ''],
		] as [string, string][]
	).filter(([, v]) => v && v.trim());

	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				background: '#fff',
				fontFamily: 'sans-serif',
				color: INK,
			}}
		>
			{/* The banner carries the whole message at thumbnail size: who is
			    hiring. Everything below it is confirmation. */}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					background: NAVY,
					color: '#fff',
					padding: `${Math.round(44 * s)}px ${pad}px ${Math.round(36 * s)}px`,
				}}
			>
				<div
					style={{
						display: 'flex',
						fontSize: fit(job.company, Math.round(78 * t), Math.round(50 * t), 22),
						fontWeight: 800,
						letterSpacing: -2 * s,
						lineHeight: 1.05,
					}}
				>
					{job.company}
				</div>
				<div
					style={{
						display: 'flex',
						fontSize: Math.round(36 * t),
						fontWeight: 700,
						color: NAVY_SOFT,
						letterSpacing: 6 * s,
						marginTop: Math.round(10 * s),
					}}
				>
					IS HIRING
				</div>
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					padding: `${Math.round(32 * s)}px ${pad}px ${Math.round(24 * s)}px`,
					flex: 1,
					justifyContent: 'center',
				}}
			>
				<div
					style={{
						display: 'flex',
						fontSize: fit(job.role, Math.round(52 * t), Math.round(36 * t), 30),
						fontWeight: 800,
						lineHeight: 1.1,
						marginBottom: Math.round(24 * s),
					}}
				>
					{job.role}
				</div>

				{rows.slice(0, 3).map(([k, v]) => (
					<div
						key={k}
						style={{
							display: 'flex',
							borderTop: `2px solid ${RULE}`,
							padding: `${Math.round(14 * s)}px 0`,
							fontSize: rowSize,
							/* Not baseline: a value that wraps to two lines would drag its
							   label down to the second one. */
							alignItems: 'flex-start',
						}}
					>
						<div
							style={{
								display: 'flex',
								width: Math.round(250 * t),
								color: MUTED,
								fontWeight: 600,
							}}
						>
							{k}
						</div>
						<div style={{ display: 'flex', flex: 1, fontWeight: 700 }}>{v.slice(0, 42)}</div>
					</div>
				))}
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					background: GREEN,
					color: '#fff',
					padding: `${Math.round(26 * s)}px ${pad}px`,
					fontSize: Math.round(38 * t),
					fontWeight: 800,
					letterSpacing: 2 * s,
				}}
			>
				<div style={{ display: 'flex' }}>APPLY NOW</div>
				<div style={{ display: 'flex', fontSize: Math.round(30 * t), letterSpacing: 0 }}>
					PehlaJob
				</div>
			</div>
		</div>
	);
}
