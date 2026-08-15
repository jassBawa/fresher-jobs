import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { Nav } from '@/components/Nav';
import './globals.css';

export const metadata: Metadata = {
	metadataBase: new URL(process.env.SITE ?? 'http://localhost:3000'),
	title: 'Fresher Jobs in India — Off Campus Drives, Batch-wise | PehlaJob',
	description:
		'Fresh openings for freshers and early-career candidates in India. Batch, qualification, location and closing date on every listing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	const adsClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

	return (
		<html lang="en-IN">
			<head>
				<link rel="preload" href="/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
				<meta name="theme-color" content="#0b6b35" />
			</head>
			<body>
				{/*
				THESIS: A job listing read as the confirmation screen this audience already
				reads a hundred times a month — outcome first, the facts that prove it
				second, one action last. It refuses the vertical's two defaults equally:
				the sarkari bordered results table, and the SaaS job board of rounded cards.
				OWN-WORLD: White ground, near-black ink, one committed green owning full-width
				status fields. Archivo, self-hosted. Rows separated by hairlines, never boxed
				into cards. Key-value rails at one type size; rank by weight, case, reversal
				and rule. Status is a drawn mark plus a word, never colour alone.
				STORY: The visitor lands deep from a search or a WhatsApp forward, learns in
				one glance whether it is open and whether their batch qualifies, and leaves
				through the apply link — which is the success state, not a bounce.
				FIRST VIEWPORT: Three-line masthead; a full-bleed green status field naming
				the page, its live count and the date checked; then listing rows as receipt
				lines. The reserved ad slot sits below the first rows, never above them.
				FORM: Confirmation Screen, candidate 5 of 7, seed d785fe22.
				*/}
				<a className="skip" href="#main">
					Skip to listings
				</a>

				<header className="masthead">
					<div className="wrap masthead__inner">
						<Link className="brand" href="/">
							PehlaJob<span className="brand__dot">.</span>
						</Link>
						<div className="masthead__lines">
							<p className="masthead__line">
								Fresher jobs in India — checked, dated, linked to the real form.
							</p>
							<p className="masthead__promise">
								Nothing is published without a human reading it first.
							</p>
						</div>
					</div>
				</header>

				<Nav />

				<main id="main">{children}</main>

				<footer className="foot">
					<div className="wrap">
						<nav className="foot__nav" aria-label="Browse">
							<Link href="/">All openings</Link>
							<Link href="/2026-batch-jobs/">2026 batch</Link>
							<Link href="/software-engineer-jobs/">Software engineer</Link>
							<Link href="/jobs-in-bengaluru/">Bengaluru</Link>
						</nav>
						<p className="fine">
							Listings are compiled from public announcements and rewritten from the facts.
							Every apply link is fetched and checked before publishing, and again on a
							schedule. Salary figures are estimates unless the employer states otherwise.
							Always apply on the company&apos;s own careers page — we never ask for a fee.
						</p>
					</div>
				</footer>

				{adsClient && (
					<Script
						async
						src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsClient}`}
						crossOrigin="anonymous"
						strategy="afterInteractive"
					/>
				)}
			</body>
		</html>
	);
}
