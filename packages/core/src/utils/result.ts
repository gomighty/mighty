// https://gist.github.com/t3dotgg/a486c4ae66d32bf17c09c73609dacc5b

export type Ok<T> = {
  data: T;
  error: null;
};

export type Err<E> = {
  data: null;
  error: E;
};

export type Result<T, E = Error> = Ok<T> | Err<E>;

export async function resultFromAsync<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

export function resultFromSync<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    const data = fn();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}
