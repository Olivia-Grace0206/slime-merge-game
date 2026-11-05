/** Fixture serializer: schema8 has decimal currency strings; historical schemas keep numbers.
 * Historical fixtures begin with freshSession only to share noncurrency defaults.
 */
export function fixtureJSON(value: unknown, replacer?: null, space?: number): string {
  void replacer
  const root = value as {version?:number;game?:{bounds?:{plots?:readonly string[];width:number;height:number}}}
  const legacy = typeof root?.version === 'number' && root.version < 8
  return JSON.stringify(value, (key, v: unknown) => {
    if (typeof v === 'bigint') {
      if (!legacy) return v.toString()
      const n = Number(v)
      if (!Number.isSafeInteger(n)) throw new Error('Unsafe legacy fixture')
      return n
    }
    if (legacy && key === 'bounds' && root.game?.bounds === v && root.game?.bounds?.plots?.join() === 'A') {
      return {origin:{x:0,y:0},width:4,height:4}
    }
    return v
  }, space)
}
