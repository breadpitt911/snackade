// Terms of Use and Privacy Policy. One source for the server-rendered page and the app.
// Operator name, contact email and country come from the environment (see DEPLOY.md).
// These are a solid starting point, not legal advice: have a lawyer look before you monetise.
import { config } from './config.js';

export const LEGAL_UPDATED = '2026-10-15';
export const MIN_AGE = 16;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const contactEmail = () => config.contactEmail || `hello@${new URL(config.siteOrigin).hostname.replace(/^www\./, '')}`;

function facts() {
  const host = new URL(config.siteOrigin).host;
  const site = esc(config.siteName);
  const email = contactEmail();
  return {
    site, host: esc(host), country: esc(config.legalCountry),
    operator: config.operatorName ? `${esc(config.operatorName)}, the operator of ${site}` : `the team that runs ${site}`,
    who: config.operatorName ? esc(config.operatorName) : site,
    mail: `<a href="mailto:${esc(email)}">${esc(email)}</a>`,
    playHost: esc(new URL(config.gamesOrigin).host),
    updated: new Date(LEGAL_UPDATED + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
}

function terms() {
  const f = facts();
  return `
<div class="tldr"><b>The short version.</b> Play for free. If you upload a game, it has to be yours to share, and you stay the owner. Be decent in the comments. XP and badges are just for fun and are not worth money. If something on here is yours and shouldn't be, hit Report or email us and we'll deal with it.</div>

<h2 id="who">1. Who we are</h2>
<p>${f.site} (${f.host}) is run by ${f.operator}. In these terms, "we" and "us" means us, and "you" means anyone using the site. Questions about these terms: ${f.mail}.</p>
<p>By using ${f.site} you agree to these terms and to our <a href="/privacy">Privacy Policy</a>. If you don't agree, please don't use the site.</p>

<h2 id="age">2. Who can use it</h2>
<p>Anyone can play games without an account. To create an account, upload a game, comment or rate, you need to be at least ${MIN_AGE}. If you're younger, you can still play, but please don't sign up.</p>

<h2 id="account">3. Your account</h2>
<p>Keep your password to yourself. You're responsible for what happens on your account. One person per account, and one account per person; extra accounts used to farm XP or stack ratings will be removed. You can delete your account at any time in <a href="/settings">Settings</a>.</p>

<h2 id="content">4. Games and comments you post</h2>
<p><b>You keep ownership.</b> Uploading a game, cover image or comment does not give us ownership of it. You give us a free, worldwide, non-exclusive licence to host, copy, run, display and share it on ${f.site} and to use its name, cover and screenshots to promote it (for example on the home page, in the Hall of Fame or in a link preview). The licence ends when you delete the content or your account, except for copies in backups, which roll off within about two weeks.</p>
<p><b>You promise that:</b></p>
<ul>
<li>you made it, or you have permission to share every part of it: code, art, music, sound, fonts and characters. Free assets must be used under their licence terms, including any credit they require;</li>
<li>it contains no malware, crypto mining, phishing or anything that tries to break out of the game frame or attack players or the site;</li>
<li>it doesn't secretly collect personal data from players. If your game sends data anywhere, say so in its description;</li>
<li>it's legal, and contains no sexual content involving minors, no explicit sexual content, no content promoting terrorism, and no hate or harassment targeting people for who they are;</li>
<li>for GitHub and hosted-link games, you have the right to share what's at that address, and you understand it is loaded from there.</li>
</ul>
<p>We don't review games before they go live, but we can remove any game or comment, hide it, or take away XP earned from it if it breaks these terms or the law, or if we receive a valid complaint about it.</p>

<h2 id="rules">5. House rules</h2>
<ul>
<li>No spam, scams or ads in comments or game descriptions.</li>
<li>No harassment, threats, hate or doxxing.</li>
<li>No gaming the system: fake scores, vote rings, buying ratings or multiple accounts.</li>
<li>No attacking the site: probing for security holes without permission, overloading it, or scraping it in a way that slows it down. If you find a security bug, email us and we'll thank you.</li>
<li>Don't pretend to be someone else, including us.</li>
</ul>

<h2 id="reports">6. Reporting and takedowns</h2>
<p>Every game and comment has a <b>Report</b> button. You don't need an account to report a game. We look at reports as soon as we can and act on anything illegal or against these terms.</p>
<p><b>Copyright and other rights.</b> If a game uses your work without permission, report it with the reason "Copyright" or email ${f.mail}. Please include:</p>
<ol>
<li>what work is yours, and where we can see the original;</li>
<li>the link to the game on ${f.site};</li>
<li>your name and an email address we can reach you on;</li>
<li>a statement that you believe in good faith the use isn't authorised by you, your agent or the law; and</li>
<li>a statement that your notice is accurate and that you own the rights or are authorised to act for the owner.</li>
</ol>
<p>We may pass your name and complaint to the uploader so they can respond. If we remove your game and you think we got it wrong, email us and explain why. We'll review it, and we may restore the game. Accounts that repeatedly upload other people's work will be closed.</p>
<p>When we remove or hide your content, we'll tell you why on the game's page where we can, and you can ask us to take another look.</p>

<h2 id="xp">7. XP, levels, badges and the Hall of Fame</h2>
<p>XP, levels, badges, leaderboards, Snack Scores and Game of the Month are just for fun. They have no cash value, can't be bought, sold or transferred, and aren't property. We can change how they work, correct mistakes, or remove points earned by breaking the rules. If we ever offer real prizes, those will come with their own rules.</p>

<h2 id="third">8. Games made by other people</h2>
<p>Most games here are made by players, not by us. They run in a sandbox on a separate address (${f.playHost}) so they can't reach your account. We still can't check every game, so we don't guarantee they work, are suitable for you, or are free of mistakes. Hosted-link and GitHub games are loaded from their own servers, under their owners' terms. A game being on ${f.site} doesn't mean we endorse it.</p>

<h2 id="ads">9. Ads</h2>
<p>${f.site} is free. We may show ads in the future to cover running costs. If we do, we'll update the Privacy Policy first and ask for your consent where the law requires it.</p>

<h2 id="warranty">10. No guarantees</h2>
<p>We run ${f.site} as a hobby-scale service and provide it "as is". We'll try to keep it up and your data safe, but we can't promise it will always be available, error-free, or that scores and XP will never be lost.</p>
<p>As far as the law allows, we aren't liable for indirect losses, lost profits or lost data, or for anything caused by games or comments other people post. Nothing in these terms limits liability that can't legally be limited, such as for death or personal injury caused by negligence, or for fraud. Nothing here affects your rights as a consumer.</p>

<h2 id="ending">11. Ending things</h2>
<p>You can stop using ${f.site} and delete your account at any time. We can suspend or close accounts that break these terms. Where it's reasonable, we'll tell you why.</p>

<h2 id="changes">12. Changes to these terms</h2>
<p>We may update these terms as the site grows. The date at the top shows the latest version. If a change is significant, we'll put a notice on the site before it takes effect. If you keep using ${f.site} after that, you accept the new terms.</p>

<h2 id="law">13. Law</h2>
<p>These terms are governed by the laws of ${f.country}, and disputes go to the courts of ${f.country}. If you're a consumer living elsewhere, you keep any protections your local law gives you and can also bring a claim where you live.</p>

<h2 id="contact">14. Contact</h2>
<p>${f.mail}</p>`;
}

function privacy() {
  const f = facts();
  return `
<div class="tldr"><b>The short version.</b> We collect what's needed to run your account and the games, and nothing else. No tracking, no analytics, no ad cookies, and we don't sell data. Your username, profile, games, comments and scores are public. You can download your data or delete your account in Settings whenever you like.</div>

<h2 id="controller">1. Who's responsible</h2>
<p>${f.who} runs ${f.site} and is the data controller for your personal data. For anything privacy-related, email ${f.mail}.</p>

<h2 id="collect">2. What we collect</h2>
<p><b>If you just play,</b> without an account, we store nothing that identifies you. We count plays per game, but anonymously. Your IP address passes through Cloudflare and our server so pages can be delivered and protected (see section 5). Our app keeps it in memory for a short time for rate limiting, and doesn't write it to its database or logs.</p>
<p><b>If you make an account,</b> we store:</p>
<ul>
<li>your username, display name, avatar and bio;</li>
<li>your password, stored only as a salted scrypt hash. We can't see it;</li>
<li>what you do on the site: games played (by day), scores, likes, ratings, comments, XP, badges and streaks;</li>
<li>games and covers you upload, and their details;</li>
<li>when you agreed to these terms.</li>
</ul>
<p><b>If you send a report,</b> we store the reason, your message and, if you give it, your email address, plus your username if you were signed in.</p>
<p>We don't ask for your real name, email (unless you report something), location, birthday or phone number.</p>

<h2 id="public">3. What's public</h2>
<p>Your username, display name, avatar, bio, level, XP, badges, the games you've uploaded, your comments, the rating you gave a game (shown next to your comment), your leaderboard scores and your Hall of Fame placings can all be seen by anyone, including search engines. Don't put anything in your bio or comments you wouldn't want public.</p>

<h2 id="why">4. Why we use it (legal bases)</h2>
<ul>
<li><b>To provide the service you signed up for</b> (contract): your account, profile, uploads, XP, scores, ratings and comments.</li>
<li><b>Legitimate interests:</b> keeping the site secure, stopping spam, cheating and abuse, handling reports, and keeping backups.</li>
<li><b>Legal obligations:</b> responding to valid legal requests and takedown notices.</li>
<li><b>Consent:</b> only if we ever add optional things like ads or analytics, and we'll ask first.</li>
</ul>

<h2 id="cookies">5. Cookies and storage</h2>
<p>We set <b>one cookie</b>, <code>__Host-snk_session</code>, and only when you sign in. It keeps you logged in, lasts up to 30 days, and is strictly necessary, so it doesn't need a consent banner. Your theme choice (light or dark) is saved in your browser's local storage and never sent to us. No analytics, advertising or tracking cookies.</p>
<p>Games run on ${f.playHost}. Some games save progress in your browser on that address. Games uploaded by players, especially hosted-link games, can load content from other servers, which then see your IP address. That's outside our control. Each game page shows where it comes from.</p>

<h2 id="share">6. Who we share it with</h2>
<p>We don't sell or rent personal data, and we don't share it for advertising. We use a few service providers to run the site, who only process data on our behalf:</p>
<ul>
<li><b>Cloudflare</b> handles DNS, delivery, caching and security for every request, so it processes IP addresses and request details. See Cloudflare's privacy policy.</li>
<li><b>Oracle Cloud Infrastructure</b> hosts our server and database, in its UK (London) region.</li>
</ul>
<p>If a game you uploaded gets a copyright complaint, we may share the complaint with you, and your username and the game with the complainant. We'll disclose data to authorities only when legally required.</p>

<h2 id="transfers">7. International transfers</h2>
<p>Our server is in the UK, which the EU recognises as having adequate data protection. Cloudflare operates worldwide and may process data in other countries, including the US. It relies on recognised safeguards such as the EU Standard Contractual Clauses and the EU-US Data Privacy Framework.</p>

<h2 id="keep">8. How long we keep it</h2>
<ul>
<li>Account data: until you delete your account.</li>
<li>Login sessions: up to 30 days, or until you sign out.</li>
<li>Reports: while open, then one year after they're resolved, in case of disputes.</li>
<li>Backups: daily snapshots, kept for 14 days. Deleted data disappears from backups within that time.</li>
</ul>

<h2 id="rights">9. Your rights</h2>
<p>Depending on where you live (including under the EU and UK GDPR), you can:</p>
<ul>
<li><b>see and download</b> your data: Settings → Download my data;</li>
<li><b>correct it:</b> edit your profile any time;</li>
<li><b>delete it:</b> Settings → Delete account removes your account, games, comments, ratings and scores straight away;</li>
<li><b>object to or restrict</b> how we use it, or withdraw consent you've given;</li>
<li><b>complain</b> to a data protection authority. In ${f.country} that's the Commissioner for Personal Data Protection (dataprotection.gov.cy), or the authority where you live.</li>
</ul>
<p>For anything you can't do in Settings, email ${f.mail}. We'll reply within one month.</p>

<h2 id="kids">10. Children</h2>
<p>Accounts are for people aged ${MIN_AGE} and over. We don't knowingly collect data from younger children. If you think a child under ${MIN_AGE} has made an account, tell us and we'll delete it. If we ever show ads, they won't be personalised for anyone we believe is under 18.</p>

<h2 id="security">11. Security</h2>
<p>Everything is served over HTTPS. Passwords are hashed with scrypt. Uploaded games run on a separate address in a sandbox, so they can't read your login. We keep the server patched and backed up. No system is perfect: if we ever have a breach that affects you, we'll tell you and the authorities as the law requires.</p>

<h2 id="changes">12. Changes</h2>
<p>If we change this policy, we'll update the date at the top. If a change is significant, for example adding ads or analytics, we'll put a notice on the site before it takes effect.</p>`;
}

export const LEGAL_PAGES = {
  terms: { title: 'Terms of Use', description: () => `The rules for using ${config.siteName}: playing, uploading games, comments, XP, and how reports and takedowns work.`, html: terms },
  privacy: { title: 'Privacy Policy', description: () => `What ${config.siteName} collects (not much), why, who sees it, and how to download or delete your data.`, html: privacy },
};

export function legalPage(name) {
  const p = LEGAL_PAGES[name];
  if (!p) return null;
  return { title: p.title, description: p.description(), updated: LEGAL_UPDATED, updatedText: facts().updated, html: p.html() };
}
