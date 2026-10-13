# Deploying Snackbar for free (Oracle Cloud + Cloudflare)

The setup: one free Oracle Cloud server runs the app, and Cloudflare sits in front of it. Cloudflare handles HTTPS, caches the heavy game files and soaks up traffic spikes. The server connects *out* to Cloudflare through a **Cloudflare Tunnel**, so you never open a port on the server or deal with certificates.

```
visitors ──https──▶ Cloudflare ──tunnel──▶ Oracle VM: cloudflared ──▶ Snackbar on 127.0.0.1:8080
   snackbar.games  (the site)
   play.snackbar.games  (the games, kept on a separate hostname on purpose)
```

What you need: a domain (around $10/year from any registrar), a free Cloudflare account and an Oracle Cloud account (it asks for a card to verify you, but the Always Free stuff costs nothing). Plan on about 30–45 minutes.

Everywhere below, swap `snackbar.games` for your actual domain.

## 1. Put your domain on Cloudflare

1. In Cloudflare, **Add a domain** and pick the **Free** plan.
2. At your registrar, change the nameservers to the two Cloudflare gives you. It can take anywhere from a few minutes to a few hours to switch over.

## 2. Create the Oracle server

1. In the Oracle Cloud console: **Compute → Instances → Create instance**.
2. **Image:** Canonical Ubuntu 24.04 (or 22.04).
3. **Shape:** Ampere → `VM.Standard.A1.Flex`, **2 OCPUs, 12 GB memory**. That's within the Always Free limit.
4. **SSH keys:** upload your public key, or let it generate one and download it.
5. Create it. If you get an "out of capacity" error, try another availability domain or try again later. Popular regions run out sometimes.

You don't need to open any extra ports. The tunnel only makes outgoing connections.

> Oracle can reclaim Always Free instances that sit basically idle for a week. A site with real visitors won't trip it, and upgrading the account to Pay As You Go (still free if you stay within the limits) stops reclaiming entirely.

## 3. Create the tunnel in Cloudflare

1. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel** → **Cloudflared**. Name it `snackbar`.
2. On the install screen, copy the **token** (the long string after `cloudflared service install`). You don't need to run their command, the setup script does it.
3. Add two **public hostnames**, both pointing at the same place:

   | Subdomain | Domain | Service |
   |---|---|---|
   | *(empty)* | snackbar.games | `HTTP` → `localhost:8080` |
   | `play` | snackbar.games | `HTTP` → `localhost:8080` |

   Cloudflare creates the DNS records for you.

## 4. Run the setup script on the server

SSH in (`ssh ubuntu@<server-ip>`) and run:

```bash
git clone https://github.com/breadpitt911/snackade.git
cd snackade
sudo ./deploy/setup.sh --domain snackbar.games --games-domain play.snackbar.games --tunnel-token <TOKEN>
```

If the repo is private, clone it with a GitHub personal access token: `git clone https://<token>@github.com/breadpitt911/snackade.git`.

The script installs Node 22 and cloudflared, puts the app in `/opt/snackbar`, keeps all data in `/var/lib/snackbar`, runs it as a locked-down background service, connects the tunnel and sets up nightly backups.

Open `https://snackbar.games` and **sign up straight away. The first account is the admin.**

## 5. Cloudflare settings worth flipping

- **SSL/TLS → Edge Certificates → Always Use HTTPS:** on.
- **Speed → Optimization:** turn **Rocket Loader** off. It rewrites scripts and the site's security policy will block it.
- **Scrape Shield → Email Address Obfuscation:** off (same reason).
- **Caching → Cache Rules → Create rule**, "Cache game files":
  - When: *Hostname equals* `play.snackbar.games`
  - Then: *Eligible for cache*, Edge TTL: *Use cache-control header if present*.

  This lets Cloudflare cache big game files (wasm, Unity data, sprites) at its edge, so they mostly never hit your server. Game pages themselves are marked `no-cache`, so updates show up right away.
- Optional: a **Redirect Rule** from `www.snackbar.games` to `snackbar.games` if you want `www` to work.

## 6. Tell search engines

Add the site to Google Search Console and Bing Webmaster Tools and submit `https://snackbar.games/sitemap.xml`. The full list is in [docs/SEO.md](docs/SEO.md).

## Day-to-day

| Task | Command |
|---|---|
| Ship new code after pushing to GitHub | `cd ~/snackade && sudo ./deploy/update.sh` |
| Import one of your GitHub games as an official game | `cd ~/snackade && sudo ./deploy/import.sh https://github.com/you/game --category shooter --featured` |
| See logs | `journalctl -u snackbar -f` |
| Restart | `sudo systemctl restart snackbar` |
| Back up right now | `sudo snackbar-backup` (backups live in `/var/backups/snackbar`) |
| Change settings | `sudo nano /etc/snackbar.env` then restart |

Copy a backup off the server now and then (`scp ubuntu@<ip>:/var/backups/snackbar/*.tgz .`). A backup on the same disk won't save you if the server gets reclaimed.

## Good to know

- **Uploads max out at 95 MB.** Cloudflare's free plan rejects anything over 100 MB. Bigger Unity builds should go up as a GitHub repo, which the server downloads directly. Change it with `MAX_UPLOAD_MB` in `/etc/snackbar.env`.
- **Why two hostnames:** games run on `play.` so an uploaded game can never act as the logged-in player. Don't point both at the same name.
- **Moving to a paid server later** (Hetzner, DigitalOcean…) is the same script on any Ubuntu box. Copy `/var/lib/snackbar` across, run setup, and point the tunnel at the new machine.
