// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Placeholder until the domain is chosen (open decision D2). Required for
	// canonical URLs and the sitemap. Real value is injected in CI.
	site: process.env.SITE || 'https://jobs.example.com',
	output: 'static',
});