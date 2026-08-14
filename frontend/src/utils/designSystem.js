export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
}

export const typography = {
  screenTitle: { fontSize: 24, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '400' },
}

export const control = {
  height: 48,
  compactHeight: 40,
  iconSize: 40,
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeStyleSheet(styleSheet, colors) {
  return Object.fromEntries(Object.entries(styleSheet).map(([name, original]) => {
    if (!isObject(original)) return [name, original]

    const style = { ...original }
    const key = name.toLowerCase()

    if (/(^card$|card$|tile$)/.test(key)) {
      style.borderRadius = radius.md
      style.borderWidth = style.borderWidth ?? 1
      style.borderColor = style.borderColor ?? colors.border
      style.backgroundColor = style.backgroundColor ?? colors.surface
    }

    if (/modal(content|container)$/.test(key) || /sheet$/.test(key)) {
      style.backgroundColor = colors.surface
      style.borderTopLeftRadius = radius.lg
      style.borderTopRightRadius = radius.lg
      style.borderWidth = style.borderWidth ?? 1
      style.borderColor = style.borderColor ?? colors.border
    }

    if (/(inputcontainer|inputwrapper|searchcontainer|searchwrapper|pickerwrapper)$/.test(key)) {
      style.borderRadius = radius.md
      style.borderWidth = style.borderWidth ?? 1
      style.borderColor = style.borderColor ?? colors.border
      style.backgroundColor = style.backgroundColor ?? colors.surfaceLight
    }

    if (/(^fab$|fabbutton$)/.test(key)) {
      style.width = 54
      style.height = 54
      style.borderRadius = radius.lg
    }

    if (/(badge|pill)$/.test(key)) {
      style.borderRadius = radius.pill
    }

    if (/button$/.test(key) && !/(text|label)$/.test(key)) {
      style.borderRadius = key.includes('fab') ? radius.lg : radius.md
      if (!style.width && !style.height) style.minHeight = style.minHeight ?? control.compactHeight
    }

    if (/(iconcontainer|iconwrap|iconbutton)$/.test(key)) {
      style.borderRadius = radius.md
    }

    if (/sectiontitle$/.test(key)) {
      style.fontSize = 17
      style.fontWeight = '700'
      style.color = colors.text
      style.letterSpacing = 0
    } else if (/(modaltitle|headertitle|screentitle)$/.test(key)) {
      style.fontSize = key.includes('header') ? 20 : 19
      style.fontWeight = '700'
      style.color = colors.text
      style.letterSpacing = 0
    }

    if (/(subtitle|description|caption|helpertext|emptytext)$/.test(key) && style.color !== colors.error) {
      style.color = colors.textLight
    }

    if (!/(fab|floating)/.test(key) && ('shadowColor' in style || 'elevation' in style)) {
      style.shadowOpacity = 0
      style.shadowRadius = 0
      style.elevation = 0
    }

    return [name, style]
  }))
}
