#!/usr/bin/env node
/**
 * Génère les images promotionnelles App Store pour chaque abonnement.
 *
 * Spécifications Apple (Guideline 2.3.2) :
 *  - Taille : 1024 x 1024 px exactement
 *  - Format : PNG aplati, SANS canal alpha / transparence
 *  - Texte grand et lisible (cause du rejet : texte trop petit)
 *
 * Usage :
 *   node scripts/generate-promo-images.js
 *
 * Les PNG sont écrits dans frontend/promo-images/.
 * Tu n'as plus qu'à les uploader dans App Store Connect
 * (chaque In-App Purchase > Image promotionnelle).
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SIZE = 1024;
const OUT_DIR = path.join(__dirname, '..', 'promo-images');

// Un plan = une image. Texte volontairement court + grand pour rester lisible.
const PLANS = [
  {
    productId: 'com.kaizen971.eas.basic.yearly',
    label: 'EAS Basic',
    tagline: 'Launch your business',
    emoji: '★',
    gradient: ['#D4AF37', '#B8941E'],
    features: ['1 business', '1 admin + 1 employee', 'Sales & expenses'],
  },
  {
    productId: 'com.kaizen971.eas.standard.yearly',
    label: 'EAS Standard',
    tagline: 'The most popular choice',
    emoji: '🚀',
    gradient: ['#6C63FF', '#4A42D4'],
    features: ['3 businesses', 'Up to 10 employees', 'All features included'],
  },
  {
    productId: 'com.kaizen971.eas.premium.yearly',
    label: 'EAS Premium',
    tagline: 'Maximum power',
    emoji: '💎',
    gradient: ['#8B5CF6', '#6D28D9'],
    features: ['100 businesses', 'Unlimited employees', 'Priority support'],
  },
];

// Échappe les caractères spéciaux XML dans le texte injecté.
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildSVG(plan) {
  const [c1, c2] = plan.gradient;

  const features = plan.features
    .map((f, i) => {
      const y = 660 + i * 92;
      return `
        <circle cx="240" cy="${y - 14}" r="26" fill="rgba(255,255,255,0.18)"/>
        <text x="240" y="${y - 2}" font-size="34" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-weight="700">✓</text>
        <text x="290" y="${y}" font-size="44" fill="#ffffff" font-family="Arial, sans-serif" font-weight="600">${esc(f)}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>

  <!-- Pastille icône -->
  <circle cx="512" cy="240" r="110" fill="rgba(255,255,255,0.15)"/>
  <text x="512" y="290" font-size="120" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif">${esc(plan.emoji)}</text>

  <!-- Nom du plan (grand & gras = lisible) -->
  <text x="512" y="450" font-size="92" font-weight="800" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif">${esc(plan.label)}</text>

  <!-- Accroche -->
  <text x="512" y="525" font-size="46" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-family="Arial, sans-serif" font-weight="500">${esc(plan.tagline)}</text>

  <!-- Séparateur -->
  <rect x="412" y="568" width="200" height="4" rx="2" fill="rgba(255,255,255,0.35)"/>

  ${features}

  <!-- Annual subscription note -->
  <text x="512" y="980" font-size="38" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="Arial, sans-serif" font-weight="600">Annual subscription</text>
</svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const plan of PLANS) {
    const svg = buildSVG(plan);
    const outPath = path.join(OUT_DIR, `${plan.productId}.png`);

    await sharp(Buffer.from(svg))
      .resize(SIZE, SIZE)
      .flatten({ background: plan.gradient[1] }) // supprime l'alpha -> PNG aplati
      .png()
      .toFile(outPath);

    console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
  }

  console.log(`\n${PLANS.length} images promotionnelles générées dans ${path.relative(process.cwd(), OUT_DIR)}/`);
  console.log('Format : 1024x1024 PNG aplati (conforme Apple 2.3.2).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
