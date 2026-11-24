export default function BrandLogo({ className = '', decorative = false }) {
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <img
        src={`${import.meta.env.BASE_URL}eas-logo.png`}
        alt={decorative ? '' : 'Logo Entreprendre avec succès'}
        className="h-full w-full object-contain"
      />
    </span>
  )
}
