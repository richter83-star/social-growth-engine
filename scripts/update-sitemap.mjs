#!/usr/bin/env node
/**
 * update-sitemap.mjs
 *
 * Updates <lastmod> dates in client/public/sitemap.xml.
 * Run manually when publishing new content:
 *   node scripts/update-sitemap.mjs [slug] [YYYY-MM-DD]
 *
 * Examples:
 *   node scripts/update-sitemap.mjs                          # Update homepage to today
 *   node scripts/update-sitemap.mjs /blog/ai-social-media-tools  # Update specific URL to today
 *   node scripts/update-sitemap.mjs /about 2026-04-05        # Update specific URL to given date
 *   node scripts/update-sitemap.mjs --all                    # Update ALL URLs to today
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITEMAP_PATH = resolve(__dirname, "../client/public/sitemap.xml");

const today = new Date().toISOString().split("T")[0];
const [, , slugArg, dateArg] = process.argv;
const targetDate = dateArg || today;

let xml = readFileSync(SITEMAP_PATH, "utf-8");

if (slugArg === "--all") {
  // Update all lastmod dates
  xml = xml.replace(/<lastmod>[^<]+<\/lastmod>/g, `<lastmod>${targetDate}</lastmod>`);
  console.log(`✅ Updated ALL <lastmod> dates to ${targetDate}`);
} else if (slugArg) {
  // Update a specific URL's lastmod
  const normalizedSlug = slugArg.startsWith("/") ? slugArg : `/${slugArg}`;
  const urlPattern = new RegExp(
    `(<loc>https://socialgrowth\\.live${normalizedSlug.replace(/\//g, "\\/")}\\/?<\\/loc>\\s*<lastmod>)[^<]+(</lastmod>)`,
    "g"
  );
  const updated = xml.replace(urlPattern, `$1${targetDate}$2`);
  if (updated === xml) {
    console.warn(`⚠️  No URL found matching: ${normalizedSlug}`);
    process.exit(1);
  }
  xml = updated;
  console.log(`✅ Updated <lastmod> for ${normalizedSlug} to ${targetDate}`);
} else {
  // Default: update homepage only
  const homepagePattern = /(<loc>https:\/\/socialgrowth\.live\/<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/;
  xml = xml.replace(homepagePattern, `$1${targetDate}$2`);
  console.log(`✅ Updated homepage <lastmod> to ${targetDate}`);
}

writeFileSync(SITEMAP_PATH, xml, "utf-8");
console.log(`📄 Sitemap saved: ${SITEMAP_PATH}`);
