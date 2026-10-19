// A formula in Markdown (`hasMath`). `/markdown` doesn't depend on Temml, so MathFormula (from `/math`, which does)
// loads with a dynamic import the first time a formula renders; until then, and if it can't load, the TeX source
// shows as code. `data-math-status` (`loading`, `ready` or `error`) says which, for tests and screenshots.
import { useEffect, useState } from 'react';
import { Code } from '../components/Code/Code';

type MathFormulaModule = typeof import('../math/MathFormula');

let loading: Promise<MathFormulaModule> | undefined;
let loaded: MathFormulaModule | undefined;

/** Loads MathFormula (and Temml) once for every Markdown formula on the page. */
function loadMathFormula(): Promise<MathFormulaModule> {
  loading ??= import('../math/MathFormula').then((module) => {
    loaded = module;
    return module;
  });
  return loading;
}

export interface MarkdownMathProps {
  tex: string;
  display: 'inline' | 'block';
}

export function MarkdownMath({ tex, display }: MarkdownMathProps) {
  const [module, setModule] = useState(loaded);
  const [hasFailed, setFailed] = useState(false);

  useEffect(() => {
    if (module) {
      return;
    }
    let isCurrent = true;
    loadMathFormula().then(
      (loadedModule) => {
        if (isCurrent) {
          setModule(loadedModule);
        }
      },
      () => {
        if (isCurrent) {
          setFailed(true);
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [module]);

  if (module) {
    // Markdown authors opt in to chemistry by writing \ce{…}, so it's on here.
    return <module.MathFormula tex={tex} display={display} hasChemistry data-math-status="ready" />;
  }
  const status = hasFailed ? 'error' : 'loading';
  return display === 'block' ? (
    <div data-math-status={status} className="my-4 text-center">
      <Code>{tex}</Code>
    </div>
  ) : (
    <span data-math-status={status}>
      <Code>{tex}</Code>
    </span>
  );
}
