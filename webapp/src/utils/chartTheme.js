// Couleurs de séries validées (script dataviz, mode dark, surface #1A1A1A) :
// bande de luminance OK, chroma OK, séparation CVD OK, contraste >= 3:1.
// Ordre fixe — ne pas recycler les teintes au-delà de 4 séries.
export const SERIES = {
  gold: '#C98500',   // slot 1 — ventes / valeurs principales
  blue: '#3987E5',   // slot 2
  red: '#E66767',    // slot 3 — dépenses / négatif
  violet: '#9085E9', // slot 4
}

export const CATEGORICAL = [SERIES.gold, SERIES.blue, SERIES.red, SERIES.violet]

// Encre du texte des charts : toujours les tokens texte, jamais la couleur de série
export const CHART_TEXT = {
  primary: '#F5F5F5',
  secondary: '#999999',
  grid: 'rgba(255,255,255,0.07)',
}

export const TOOLTIP_STYLE = {
  backgroundColor: '#0A0A0A',
  border: '1px solid #3D3D3D',
  borderRadius: 10,
  color: '#F5F5F5',
  fontSize: 12.5,
}
