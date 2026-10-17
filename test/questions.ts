// Long question titles for the DataTable truncation stories and tests.

export interface Question {
  id: string;
  question: string;
  domain: string;
  difficulty: string;
  attempts: number;
}

export const questions: Question[] = [
  {
    id: 'q1',
    question:
      'A ball is thrown horizontally at 12 metres per second from the top of a 45-metre cliff. Ignoring air resistance, how long does it take to reach the ground, and how far from the base of the cliff does it land?',
    domain: 'Kinematics',
    difficulty: 'Medium',
    attempts: 14,
  },
  {
    id: 'q2',
    question:
      'A satellite orbits Earth in a circle at twice Earth’s radius from its centre. How does the gravitational force on it compare with the force it would feel on the surface, and why doesn’t it fall?',
    domain: 'Gravity and orbits',
    difficulty: 'Hard',
    attempts: 9,
  },
  {
    id: 'q3',
    question:
      'Light from a distant galaxy arrives with its spectral lines shifted toward longer wavelengths. What does this tell us about the galaxy’s motion relative to us, and what is the effect called?',
    domain: 'Light and astronomy',
    difficulty: 'Easy',
    attempts: 21,
  },
];
