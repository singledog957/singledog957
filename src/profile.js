import { fetchContributions } from './fetch-contributions.js';
import { generateSVG } from './generate-svg.js';
import { readFileSync, writeFileSync } from 'node:fs';

const username = 'singledog957';
const token = process.env.GITHUB_TOKEN || null;
const data = await fetchContributions(username, token);
const selected = JSON.parse(readFileSync('featured-prs.json', 'utf8'));
const headers = { 'User-Agent': 'singledog957-profile', Accept: 'application/vnd.github+json' };
if (token) headers.Authorization = `Bearer ${token}`;
const contributions = [];
for (const repo of data.contributions) {
  const prs = repo.prs.filter(pr => selected.includes(`${repo.name}#${pr.number}`) && pr.mergedAt);
  if (!prs.length) continue;
  const response = await fetch(`https://api.github.com/repos/${repo.name}`, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Repository lookup failed: ${repo.name}, ${response.status}`);
  const metadata = await response.json();
  contributions.push({ ...repo, stars: metadata.stargazers_count, prs });
}
const found = contributions.reduce((count, repo) => count + repo.prs.length, 0);
if (found !== selected.length) throw new Error('Some selected PRs are missing from verified merged contributions; keeping existing cards.');
contributions.sort((a, b) => b.stars - a.stars);
const cardData = { ...data, contributions };
for (const theme of ['light', 'tokyo']) {
  const svg = generateSVG(cardData, { theme, width: 880, maxRepos: 4, sortBy: 'featured', title: 'Selected Open Source Contributions' });
  writeFileSync(`contributions-${theme}.svg`, svg);
}
console.log(`Generated cards: ${found} selected PRs; ${data.totalPRs} total merged PRs across ${data.totalRepos} repositories.`);
