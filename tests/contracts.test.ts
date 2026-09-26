import assert from 'node:assert/strict';
import test from 'node:test';
import { appointmentScheduleUpdateSchema } from '../packages/contracts/src/index.js';

test('appointment schedule contract accepts only a valid date and time', () => {
  assert.deepEqual(
    appointmentScheduleUpdateSchema.parse({
      appointmentDate: '2026-09-28',
      appointmentTime: '09:30',
    }),
    { appointmentDate: '2026-09-28', appointmentTime: '09:30' },
  );
});

test('appointment schedule contract rejects extra fields and invalid values', () => {
  assert.equal(
    appointmentScheduleUpdateSchema.safeParse({
      appointmentDate: '2026-09-28',
      appointmentTime: '09:30',
      technicianId: '7',
    }).success,
    false,
  );
  assert.equal(
    appointmentScheduleUpdateSchema.safeParse({
      appointmentDate: '2026-02-31',
      appointmentTime: '09:30',
    }).success,
    false,
  );
  assert.equal(
    appointmentScheduleUpdateSchema.safeParse({
      appointmentDate: '2026-09-28',
      appointmentTime: '24:00',
    }).success,
    false,
  );
});
