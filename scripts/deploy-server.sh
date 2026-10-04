#!/usr/bin/env bash
# Exécuté par GitHub Actions sur le serveur via SSH.
set -euo pipefail

commit="${1:?Commit manquant}"
archive="${2:?Archive web manquante}"
branch="${3:?Branche manquante}"
repo=/home/admin/BussnessApp
pm2_app=businessapp

[[ "$commit" =~ ^[0-9a-f]{40}$ ]] || { echo 'Commit invalide' >&2; exit 1; }
[[ "$archive" == "/tmp/bussnessapp-${commit}.tar.gz" ]] || { echo 'Archive invalide' >&2; exit 1; }
[[ "$branch" =~ ^[A-Za-z0-9._/-]+$ ]] || { echo 'Branche invalide' >&2; exit 1; }
test -f "$archive"
trap 'rm -f "$archive"' EXIT

cd "$repo"
test "$(git branch --show-current)" = "$branch"
if test -n "$(git status --porcelain --untracked-files=no)"; then
  echo 'Modifications locales suivies avant le déploiement :'
  git status --short --untracked-files=no
  git stash push -m "predeploy-${commit}" -- .
fi

git fetch origin "$branch"
test "$(git rev-parse FETCH_HEAD)" = "$commit" || { echo 'Le commit distant a changé pendant le déploiement.' >&2; exit 1; }
git merge --ff-only FETCH_HEAD

cd "$repo/backend"
npm ci --omit=dev
pm2 restart "$pm2_app" --update-env

for attempt in {1..30}; do
  if curl --fail --silent http://localhost:3003/BussnessApp >/dev/null; then break; fi
  if test "$attempt" -eq 30; then
    pm2 logs "$pm2_app" --lines 30 --nostream
    echo 'API indisponible après redémarrage.' >&2
    exit 1
  fi
  sleep 2
done

stage="$(mktemp -d)"
trap 'rm -rf "$stage"; rm -f "$archive"' EXIT
tar -xzf "$archive" -C "$stage"
test -f "$stage/backoffice/dist/index.html"
test -f "$stage/webapp/dist/index.html"

backup="/home/admin/deploy-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup"
sudo -n cp -a /var/www/backoffice "$backup/backoffice"
sudo -n cp -a /var/www/webapp/dist "$backup/webapp"

publish() {
  local source="$1" target="$2"
  sudo -n find "$target" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  sudo -n cp -a "$source"/. "$target"/
}
publish "$stage/backoffice/dist" /var/www/backoffice
publish "$stage/webapp/dist" /var/www/webapp/dist
echo "Déploiement terminé : $commit. Sauvegarde : $backup"
