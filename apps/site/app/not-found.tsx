import Link from 'next/link';
import { JobList } from '@/components/JobList';
import { liveListings } from '@/lib/db';
import { today, shortDay } from '@/lib/listings';

// A dead end is where a visitor is most likely to leave, so this page does the
// one useful thing it can: show what is actually open right now.
export default async function NotFound() {
	const on = today();
	const recent = (await liveListings()).slice(0, 5);

	return (
		<>
			<section className="field field--closed">
				<div className="wrap field__inner">
					<h1 className="display">That page isn&apos;t here</h1>
					<p className="field__meta">
						<span>The listing may have closed, or the link may be wrong.</span>
					</p>
				</div>
			</section>

			<div className="wrap">
				<h2 className="label recent">Open right now · checked {shortDay(on)}</h2>
				<JobList listings={recent} empty="Nothing is published yet." />
				<p className="back rule-top">
					<Link href="/">← All openings</Link>
				</p>
			</div>
		</>
	);
}
