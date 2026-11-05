#!/bin/bash
# Double-cliquer pour construire un AAB sur ce Mac et l'envoyer à Google Play.
# CLI : internal | production | submit-build BUILD_ID [internal|production]
#       submit-file CHEMIN_AAB [internal|production] | credentials
set -Eeuo pipefail

APP_DIR="${EAS_APP_DIR:-$HOME/ProjetTest/BussnessApp/frontend}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="${EAS_OUT_DIR:-$SCRIPT_DIR/builds}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export PATH="$JAVA_HOME/bin:/opt/homebrew/bin:$ANDROID_HOME/platform-tools:$PATH"

finish() {
  status=$?
  if [ "$status" -eq 0 ]; then
    echo "Terminé."
  else
    echo "Échec (code $status). Consulte les messages ci-dessus."
  fi
  if [ -t 0 ]; then
    echo
    read -r -p "Appuie sur Entrée pour fermer..." _ || true
  fi
}
trap finish EXIT

die() { echo "Erreur : $*" >&2; exit 1; }
valid_track() { case "$1" in internal|production) ;; *) die "Piste inconnue : $1" ;; esac; }

mode="${1:-}"
if [ -z "$mode" ]; then
  echo "Publication Android — Google Play"
  echo "1) Construire un AAB et envoyer en test interne"
  echo "2) Construire un AAB et envoyer en production"
  echo "3) Envoyer un build EAS existant (sans reconstruire)"
  echo "4) Configurer la clé de compte de service Google Play dans Expo"
  read -r -p "Choix [1] : " choice
  case "$choice" in
    2) mode=production ;;
    3) mode=submit-build ;;
    4) mode=credentials ;;
    *) mode=internal ;;
  esac
fi

[ -d "$APP_DIR" ] || die "Projet introuvable : $APP_DIR"
cd "$APP_DIR"
command -v eas >/dev/null || die "eas-cli introuvable (npm install -g eas-cli)"
eas whoami >/dev/null || die "Connecte-toi d'abord à Expo : eas login"

case "$mode" in
  credentials)
    echo "Dans EAS : production > Google Service Account > Upload a Google Service Account Key."
    eas credentials --platform android
    exit 0
    ;;
  submit-build)
    build_id="${2:-}"
    if [ -z "$build_id" ]; then read -r -p "ID du build EAS terminé : " build_id; fi
    [[ "$build_id" =~ ^[0-9a-fA-F-]{36}$ ]] || die "ID de build invalide."
    track="${3:-internal}"
    valid_track "$track"
    echo "Envoi du build EAS $build_id sur la piste $track..."
    eas submit --platform android --profile "$track" --id "$build_id" --wait
    exit 0
    ;;
  submit-file)
    aab_file="${2:-}"
    [ -f "$aab_file" ] || die "AAB introuvable : $aab_file"
    track="${3:-internal}"
    valid_track "$track"
    echo "Envoi de $aab_file sur la piste $track..."
    eas submit --platform android --profile "$track" --path "$aab_file" --wait
    exit 0
    ;;
  internal|production)
    track="$mode"
    ;;
  *)
    die "Utilisation : $0 [internal|production|submit-build ID [piste]|submit-file AAB [piste]|credentials]"
    ;;
esac

command -v java >/dev/null || die "Java 17 introuvable ($JAVA_HOME)"
[ -d "$ANDROID_HOME/platforms" ] || die "SDK Android introuvable ($ANDROID_HOME)"

if [ -n "$(git status --porcelain -- . 2>/dev/null)" ]; then
  echo "Attention : les modifications locales de l'application seront incluses dans l'AAB."
  git status --short -- . | head -15
  read -r -p "Continuer ? (o/N) " answer
  [[ "$answer" =~ ^[oOyY]$ ]] || die "Build annulé."
fi

if [ "$track" = production ]; then
  read -r -p "Publier directement sur la piste PRODUCTION ? (écrire PRODUCTION) " answer
  [ "$answer" = PRODUCTION ] || die "Publication annulée."
fi

mkdir -p "$OUT_DIR"
caffeinate -i -w $$ &
tmp_dir="$(mktemp -d)"
tmp_aab="$tmp_dir/app.aab"
echo "Construction locale de l'AAB signé (profil EAS production)..."
eas build --platform android --profile production --local --non-interactive --output "$tmp_aab"
[ -s "$tmp_aab" ] || die "Le build n'a pas produit d'AAB."

app_version="$(node -p "require('./app.json').expo.version")"
aab_file="$OUT_DIR/EAS-$app_version-$(date '+%Y%m%d-%H%M%S').aab"
[ ! -e "$aab_file" ] || die "Le fichier existe déjà : $aab_file"
mv "$tmp_aab" "$aab_file"
rmdir "$tmp_dir"
echo "AAB créé : $aab_file"

echo "Envoi sur Google Play, piste $track..."
echo "Si EAS demande une clé Google Service Account, lance d'abord l'option 4 après l'avoir créée."
eas submit --platform android --profile "$track" --path "$aab_file" --wait
echo "Soumission terminée. Vérifie le statut de la version dans Google Play Console."
