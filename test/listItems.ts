// Deterministic rows for the ListView and TransferList stories and tests: people with roles, teams and statuses.

import { people } from './people';

export const teams = ['Observatory', 'Archive', 'Operations', 'Research'] as const;
export const roles = ['Astronomer', 'Engineer', 'Archivist', 'Analyst', 'Technician'] as const;

/** `count` people, cycling through the names (numbered after the first round) and roles; each round joins a team. */
export function listPeople(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const person = people[index % people.length] ?? people[0];
    const round = Math.floor(index / people.length);
    const name = round === 0 ? person.name : `${person.name} ${String(round + 1)}`;
    const team = teams[round % teams.length] ?? teams[0];
    return {
      id: `person-${String(index)}`,
      label: name,
      description: `${roles[index % roles.length] ?? ''} · ${team}`,
      team,
      src: 'src' in person ? person.src : undefined,
    };
  });
}
