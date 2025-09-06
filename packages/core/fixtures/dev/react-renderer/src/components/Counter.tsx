import { useState } from "react";

export function Counter({ title }: { title: string }) {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>{title}</h1>
      <button type="button" onClick={() => setCount(count + 1)}>
        {count}
      </button>
    </>
  );
}
