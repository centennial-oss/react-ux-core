// Org charts for OrgChart's tests and stories: a small observatory with assistants, badges and a stack of
// astronomers, and a generated company of any size (seeded, so it's the same every run).
import type { OrgPerson } from '../src/graph/OrgChart/types';
import { people } from './people';

export const observatoryOrg: OrgPerson[] = [
  {
    id: 'ines',
    name: 'Ines Okafor',
    title: 'Observatory Director',
    avatarSrc: people[0].src,
  },
  {
    id: 'tom',
    managerId: 'ines',
    name: 'Tom Reyes',
    title: 'Executive Assistant',
    isAssistant: true,
  },
  { id: 'mara', managerId: 'ines', name: 'Mara Lindqvist', title: 'Head of Science' },
  { id: 'kenji', managerId: 'ines', name: 'Kenji Watanabe', title: 'Head of Engineering' },
  { id: 'priya', managerId: 'ines', name: 'Priya Raman', title: 'Head of Operations' },
  {
    id: 'sam',
    managerId: 'ines',
    name: 'Sam Adeyemi',
    title: 'Head of Outreach',
    badge: { label: 'Hiring', tone: 'success' },
  },
  { id: 'aiko', managerId: 'mara', name: 'Aiko Tanaka', title: 'Astronomer' },
  {
    id: 'luis',
    managerId: 'mara',
    name: 'Luis Herrera',
    title: 'Astronomer',
    badge: { label: 'Remote' },
  },
  {
    id: 'noor',
    managerId: 'mara',
    name: 'Noor Haddad',
    title: 'Astrophysicist',
    avatarSrc: people[2].src,
  },
  { id: 'erik', managerId: 'mara', name: 'Erik Solberg', title: 'Astronomer' },
  {
    id: 'chloe',
    managerId: 'mara',
    name: 'Chloé Martin',
    title: 'Postdoctoral Fellow',
    badge: { label: 'New', tone: 'accent' },
  },
  { id: 'dev', managerId: 'kenji', name: 'Dev Malhotra', title: 'Optics Lead' },
  { id: 'hana', managerId: 'kenji', name: 'Hana Kim', title: 'Software Lead' },
  { id: 'oscar', managerId: 'kenji', name: 'Oscar Nilsson', title: 'Mechanical Engineer' },
  { id: 'rita', managerId: 'dev', name: 'Rita Costa', title: 'Optical Engineer' },
  { id: 'yusuf', managerId: 'dev', name: 'Yusuf Demir', title: 'Optical Technician' },
  { id: 'ben', managerId: 'hana', name: 'Ben Carter', title: 'Software Engineer' },
  {
    id: 'mei',
    managerId: 'hana',
    name: 'Mei Chen',
    title: 'Software Engineer',
    badge: { label: 'On leave', tone: 'warning' },
  },
  { id: 'ola', managerId: 'hana', name: 'Ola Nowak', title: 'Data Engineer' },
  {
    id: 'lena',
    managerId: 'priya',
    name: 'Lena Novak',
    title: 'Operations Assistant',
    isAssistant: true,
  },
  { id: 'ravi', managerId: 'priya', name: 'Ravi Shah', title: 'Night Operations Lead' },
  { id: 'gwen', managerId: 'priya', name: 'Gwen Morgan', title: 'Facilities Manager' },
  { id: 'jonas', managerId: 'ravi', name: 'Jonas Weber', title: 'Telescope Operator' },
  { id: 'amara', managerId: 'ravi', name: 'Amara Diallo', title: 'Telescope Operator' },
  { id: 'felix', managerId: 'sam', name: 'Felix Braun', title: 'Education Officer' },
  { id: 'sofia', managerId: 'sam', name: 'Sofía Ruiz', title: 'Visitor Centre Guide' },
];

const firstNames = [
  'Ada',
  'Bilal',
  'Carmen',
  'Daniel',
  'Elif',
  'Farah',
  'Gustavo',
  'Hiro',
  'Ingrid',
  'Jamal',
  'Kalani',
  'Lucia',
  'Mateo',
  'Nadia',
  'Omar',
  'Paula',
  'Quentin',
  'Rosa',
  'Stefan',
  'Tariq',
  'Uma',
  'Viktor',
  'Wen',
  'Ximena',
  'Yara',
  'Zoltan',
];
const lastNames = [
  'Abara',
  'Becker',
  'Castro',
  'Dubois',
  'Eriksen',
  'Fujita',
  'Garcia',
  'Hassan',
  'Ivanova',
  'Jensen',
  'Kowalski',
  'Laurent',
  'Mensah',
  'Nakamura',
  'Oliveira',
  'Petrov',
  'Quinn',
  'Rossi',
  'Santos',
  'Takahashi',
  'Ueda',
  'Varga',
  'Wójcik',
  'Xu',
  'Yilmaz',
  'Zhang',
];
const departments = ['Science', 'Engineering', 'Operations', 'Outreach', 'Finance', 'People'];
const titlesByDepth = ['Chief Executive', 'Vice President', 'Director', 'Manager', 'Team Lead'];
const badges: OrgPerson['badge'][] = [
  { label: 'Remote' },
  { label: 'New', tone: 'accent' },
  { label: 'On leave', tone: 'warning' },
];

/** A seeded pseudo-random number generator (mulberry32): the same sequence for the same seed. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A company of `count` people under one chief executive, filled level by level with 4 to 8 reports per manager. The
 * chief executive and each vice president have an assistant; every eleventh person has a badge.
 */
export function generateOrg(count: number, seed = 7): OrgPerson[] {
  const random = seeded(seed);
  const result: OrgPerson[] = [];
  const nameOf = (index: number) =>
    `${firstNames[index % firstNames.length] ?? ''} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length] ?? ''}${index >= firstNames.length * lastNames.length ? ` ${String(Math.floor(index / (firstNames.length * lastNames.length)) + 1)}` : ''}`;
  const add = (person: Omit<OrgPerson, 'id' | 'name'>) => {
    const index = result.length;
    result.push({
      id: `p${String(index)}`,
      name: nameOf(index),
      badge: index % 11 === 5 ? badges[index % badges.length] : undefined,
      ...person,
    });
    return result[index]?.id ?? '';
  };
  const depthOf = new Map<string, number>();
  const root = add({ title: titlesByDepth[0] });
  depthOf.set(root, 0);
  const queue = [root];
  for (let head = 0; head < queue.length && result.length < count; head++) {
    const manager = queue[head] ?? root;
    const depth = (depthOf.get(manager) ?? 0) + 1;
    if (depth <= 2 && result.length < count) {
      add({ managerId: manager, title: 'Executive Assistant', isAssistant: true });
    }
    const span = 4 + Math.floor(random() * 5);
    for (let report = 0; report < span && result.length < count; report++) {
      const department = departments[(head + report) % departments.length] ?? '';
      const title =
        depth < titlesByDepth.length
          ? `${titlesByDepth[depth] ?? ''}, ${department}`
          : `${department} Specialist`;
      const id = add({ managerId: manager, title });
      depthOf.set(id, depth);
      queue.push(id);
    }
  }
  return result;
}
