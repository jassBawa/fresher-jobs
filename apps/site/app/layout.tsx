import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { Nav } from '@/components/Nav';
import { today, shortDay } from '@/lib/listings';
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
				<meta name="theme-color" content="#13224b" />
			</head>
			<body>
				{/*
				THESIS: The Indian job-feed layout this audience already knows — navy bar,
				thumbnail cards, right sidebar — built honestly. Every thumbnail is
				generated from the listing's own columns rather than drawn by hand, so the
				format's central promise (you can see the eligibility before you click)
				holds on every posting instead of the twenty someone had time for.
				OWN-WORLD: Deep navy chrome, cool grey ground, white cards with a hairline.
				One committed green reserved for a single meaning — this is open, apply here
				— so it never decorates. Archivo, self-hosted. Status is a drawn mark plus a
				word, never colour alone.
				STORY: The visitor lands deep from a search or a WhatsApp forward, reads the
				card, learns whether their batch qualifies, and leaves through the apply
				link — which is the success state, not a bounce.
				FIRST VIEWPORT: Date strip, navy bar with category menus and search, then
				the count of what is open and the first cards. The reserved ad slot sits
				after the fourth card, never above the first.
				FORM: Feed Standard, rebuilt from the reference layout, August 2026.
				*/}
				<a className="skip" href="#main">
					Skip to listings
				</a>

				<div className="strip">
					<div className="wrap strip__inner">
						<span>{shortDay(today())}</span>
						<span className="strip__sep" aria-hidden="true" />
						<span>Every apply link checked before it is published</span>
					</div>
				</div>

				<Nav />

				<main id="main">{children}</main>

				<footer className="foot">
					<div className="wrap">
						<div className="foot__top">
							<div className="foot__brand">
								<span className="brand brand--foot">
									Pehla<span className="brand__b">Job</span>
								</span>
								<p className="foot__tag">
									Fresher jobs in India — checked, dated, linked to the real form.
								</p>
							</div>
							<nav className="foot__nav" aria-label="Browse">
								<Link href="/">All openings</Link>
								<Link href="/2026-batch-jobs/">2026 batch</Link>
								<Link href="/software-engineer-jobs/">Software engineer</Link>
								<Link href="/jobs-in-bengaluru/">Bengaluru</Link>
								<Link href="/search/">Search</Link>
							</nav>
						</div>
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
