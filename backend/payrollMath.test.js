const test = require('node:test');
const assert = require('node:assert/strict');
const { isChargeExpense, applySalaryChange, salaryForPeriod } = require('./payrollMath');

test('hourly pay uses completed shifts and daily overrides', () => {
  const employees = [{ _id: 'one', hourlyRate: 10, salaryMode: 'hourly' }];
  const shifts = [
    { userId: 'one', status: 'completed', duration: 4 },
    { userId: 'one', status: 'completed', duration: 2, dailySalary: 35 },
    { userId: 'one', status: 'scheduled', duration: 8 },
  ];
  assert.equal(salaryForPeriod(employees, shifts, new Date('2026-10-01'), new Date('2026-10-31')), 75);
});

test('monthly pay does not also count shifts', () => {
  const employees = [{ _id: 'one', salaryMode: 'monthly', monthlySalary: 1200, createdAt: new Date('2026-09-15') }];
  const shifts = [{ userId: 'one', status: 'completed', duration: 8, dailySalary: 100 }];
  assert.equal(salaryForPeriod(employees, shifts, new Date('2026-10-01'), new Date('2026-10-31')), 1200);
  assert.equal(salaryForPeriod(employees, shifts, new Date('2026-11-01'), new Date('2026-11-30')), 1200);
});

test('fixed pay only includes months when the employee existed', () => {
  const employees = [{ _id: 'one', salaryMode: 'monthly', monthlySalary: 900, createdAt: new Date('2026-09-15'), deletedAt: new Date('2026-10-04') }];
  assert.equal(salaryForPeriod(employees, [], new Date('2026-08-01'), new Date('2026-12-31')), 1800);
});

test('changing pay mode preserves earlier months', () => {
  const employee = { _id: 'one', salaryMode: 'hourly', hourlyRate: 10, monthlySalary: 0, createdAt: new Date('2026-08-10') };
  applySalaryChange(employee, 'monthly', 1200, new Date('2026-10-11'));
  const september = [{ userId: 'one', status: 'completed', date: new Date('2026-09-12'), duration: 8 }];
  assert.equal(salaryForPeriod([employee], september, new Date('2026-09-01'), new Date('2026-09-30')), 80);
  assert.equal(salaryForPeriod([employee], [], new Date('2026-10-01'), new Date('2026-10-31')), 1200);
  applySalaryChange(employee, 'hourly', 15, new Date('2026-11-03'));
  assert.equal(salaryForPeriod([employee], [], new Date('2026-10-01'), new Date('2026-10-31')), 1200);
  assert.equal(salaryForPeriod([employee], [{ userId: 'one', status: 'completed', date: new Date('2026-11-12'), duration: 2 }], new Date('2026-11-01'), new Date('2026-11-30')), 30);
});

test('advances and salary payment entries are excluded from charges', () => {
  assert.equal(isChargeExpense({ category: 'salary_advances' }), false);
  assert.equal(isChargeExpense({ category: 'salaries' }), false);
  assert.equal(isChargeExpense({ category: 'rent' }), true);
});
