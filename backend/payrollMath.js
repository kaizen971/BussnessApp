const isChargeExpense = expense => !['salary_advances', 'salaries'].includes(expense.category);

function salaryConfigAt(employee, date) {
  const history = employee.salaryHistory || [];
  const point = new Date(date).getTime();
  const entry = [...history].reverse().find(item => new Date(item.effectiveFrom).getTime() <= point);
  return entry || {
    salaryMode: employee.salaryMode || 'hourly',
    hourlyRate: employee.hourlyRate || 0,
    monthlySalary: employee.monthlySalary || 0,
  };
}

function applySalaryChange(employee, salaryMode, amount, now = new Date()) {
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (!employee.salaryHistory?.length) {
    const created = new Date(employee.createdAt || now);
    employee.salaryHistory = [{
      effectiveFrom: new Date(created.getFullYear(), created.getMonth(), 1),
      salaryMode: employee.salaryMode || 'hourly',
      hourlyRate: employee.hourlyRate || 0,
      monthlySalary: employee.monthlySalary || 0,
    }];
  }
  const next = {
    effectiveFrom: currentMonth,
    salaryMode,
    hourlyRate: salaryMode === 'hourly' ? amount : employee.hourlyRate || 0,
    monthlySalary: salaryMode === 'monthly' ? amount : employee.monthlySalary || 0,
  };
  const last = employee.salaryHistory[employee.salaryHistory.length - 1];
  if (new Date(last.effectiveFrom).getTime() === currentMonth.getTime()) {
    employee.salaryHistory[employee.salaryHistory.length - 1] = next;
  } else {
    employee.salaryHistory.push(next);
  }
  employee.salaryMode = salaryMode;
  employee.hourlyRate = next.hourlyRate;
  employee.monthlySalary = next.monthlySalary;
}

function salaryForPeriod(employees, schedules, start, end) {
  const employeeMap = new Map(employees.map(emp => [String(emp._id), emp]));
  const hourly = schedules.reduce((sum, shift) => {
    const emp = employeeMap.get(String(shift.userId?._id || shift.userId));
    if (!emp || shift.status !== 'completed') return sum;
    const config = salaryConfigAt(emp, shift.date || start);
    if (config.salaryMode === 'monthly') return sum;
    return sum + (shift.dailySalary != null ? shift.dailySalary : (shift.duration || 0) * (config.hourlyRate || 0));
  }, 0);
  const fixed = employees.reduce((sum, emp) => {
    const first = new Date(Math.max(new Date(start).getTime(), new Date(emp.createdAt || start).getTime()));
    const last = new Date(Math.min(new Date(end).getTime(), new Date(emp.deletedAt || end).getTime()));
    if (first > last) return sum;
    let amount = 0;
    for (let year = first.getFullYear(), month = first.getMonth(); year < last.getFullYear() || (year === last.getFullYear() && month <= last.getMonth()); month++) {
      if (month === 12) { year++; month = 0; }
      const config = salaryConfigAt(emp, new Date(year, month, 1));
      if (config.salaryMode === 'monthly') amount += config.monthlySalary || 0;
    }
    return sum + amount;
  }, 0);
  return hourly + fixed;
}

module.exports = { isChargeExpense, salaryConfigAt, applySalaryChange, salaryForPeriod };
