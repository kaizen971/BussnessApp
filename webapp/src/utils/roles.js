// Rôles « salarié » : Catalogue à la place de Produits, pas de prix de revient ni de marge
// (même règle que backend/projectAccess.js)
export const EMPLOYEE_ROLES = ['cashier', 'manager']

export const isEmployeeRole = (role) => EMPLOYEE_ROLES.includes(role)
