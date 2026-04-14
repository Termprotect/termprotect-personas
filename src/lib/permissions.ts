import { UserRole } from "@prisma/client";

type Role = "ADMIN" | "RRHH" | "MANAGER" | "EMPLEADO";

// Jerarquía de roles (de mayor a menor)
const roleHierarchy: Record<Role, number> = {
  ADMIN: 4,
  RRHH: 3,
  MANAGER: 2,
  EMPLEADO: 1,
};

export function hasRole(userRole: string, requiredRole: Role): boolean {
  return roleHierarchy[userRole as Role] >= roleHierarchy[requiredRole];
}

export const can = {
  // Empleados
  viewAllEmployees: (role: string) => hasRole(role, "RRHH"),
  editEmployee: (role: string) => hasRole(role, "RRHH"),
  createEmployee: (role: string) => hasRole(role, "RRHH"),
  deleteEmployee: (role: string) => hasRole(role, "ADMIN"),

  // Jornada
  viewOwnTimeEntries: (_role: string) => true,
  viewTeamTimeEntries: (role: string) => hasRole(role, "MANAGER"),
  viewAllTimeEntries: (role: string) => hasRole(role, "RRHH"),
  editTimeEntries: (role: string) => hasRole(role, "RRHH"), // solo RRHH puede editar fichajes

  // Vacaciones
  requestLeave: (_role: string) => true,
  approveLeave: (role: string) => hasRole(role, "MANAGER"),
  viewTeamLeave: (role: string) => hasRole(role, "MANAGER"),
  viewAllLeave: (role: string) => hasRole(role, "RRHH"),
  manageLeaveBalance: (role: string) => hasRole(role, "RRHH"),

  // Evaluaciones
  selfEvaluate: (_role: string) => true,
  evaluateTeam: (role: string) => hasRole(role, "MANAGER"),
  manageEvalCycles: (role: string) => hasRole(role, "RRHH"),
  viewAllEvaluations: (role: string) => hasRole(role, "RRHH"),

  // Formación
  viewTrainings: (_role: string) => true,
  enrollInTraining: (_role: string) => true,
  manageTrainings: (role: string) => hasRole(role, "RRHH"),

  // Analytics
  viewAnalytics: (role: string) => hasRole(role, "MANAGER"),
  viewFullAnalytics: (role: string) => hasRole(role, "RRHH"),

  // Configuración
  manageConfiguration: (role: string) => hasRole(role, "ADMIN"),
  manageUsers: (role: string) => hasRole(role, "ADMIN"),
};
