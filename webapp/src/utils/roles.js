// Rôle « salarié » (vendeur) : Catalogue à la place de Produits, ni prix de revient,
// ni marge, ni stock. Le manager a les mêmes accès que le responsable.
// (même règle que backend/projectAccess.js)
export const EMPLOYEE_ROLES = ['cashier']

export const isEmployeeRole = (role) => EMPLOYEE_ROLES.includes(role)
