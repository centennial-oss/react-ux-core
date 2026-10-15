// Type tests: compiled by `make typecheck`, not run.
import { useState } from 'react';
import { Radio, RadioGroup } from './RadioGroup';

type Plan = 'free' | 'pro' | 'enterprise';

/** A group bound to union-typed state reports that union. */
export function BoundToState() {
  const [plan, setPlan] = useState<Plan>('free');
  return (
    <RadioGroup
      label="Plan"
      value={plan}
      onChange={(next) => {
        const exact: Plan = next;
        setPlan(exact);
      }}
    >
      <Radio value="free">Free</Radio>
      <Radio value="pro">Pro</Radio>
    </RadioGroup>
  );
}

/** The state setter can be passed straight through. */
export function SetterPassedThrough() {
  const [plan, setPlan] = useState<Plan | null>(null);
  return (
    <RadioGroup label="Plan" value={plan} onChange={setPlan}>
      <Radio value="free">Free</Radio>
    </RadioGroup>
  );
}

/** A typed `onChange` handler sets the type of an uncontrolled group. */
export const typedHandler = (
  <RadioGroup label="Plan" defaultValue="pro" onChange={(next: Plan) => next}>
    <Radio value="pro">Pro</Radio>
  </RadioGroup>
);

/** Without a type, the value is a plain string (a literal `defaultValue` doesn't narrow it). */
export const untyped = (
  <RadioGroup
    label="Plan"
    defaultValue="pro"
    onChange={(next) => {
      const widened: string = next;
      // Comparing with another option is allowed because the type wasn't narrowed to "pro".
      return widened === 'free';
    }}
  >
    <Radio value="pro">Pro</Radio>
  </RadioGroup>
);

export const explicitType = (
  <RadioGroup<Plan>
    label="Plan"
    // @ts-expect-error "team" isn't a Plan
    defaultValue="team"
  >
    <Radio value="free">Free</Radio>
  </RadioGroup>
);

export function WrongHandler() {
  const [plan] = useState<Plan>('free');
  return (
    <RadioGroup
      label="Plan"
      // @ts-expect-error a handler that only accepts "free" doesn't fit a Plan value
      value={plan}
      onChange={(next: 'free') => next}
    >
      <Radio value="free">Free</Radio>
    </RadioGroup>
  );
}

export const missingValue = (
  <RadioGroup label="Plan">
    {/* @ts-expect-error every option needs a value */}
    <Radio>Free</Radio>
  </RadioGroup>
);

export const badOrientation = (
  <RadioGroup
    label="Plan"
    // @ts-expect-error orientation is horizontal or vertical
    orientation="diagonal"
  >
    <Radio value="free">Free</Radio>
  </RadioGroup>
);
