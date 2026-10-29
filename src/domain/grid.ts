/** Cell coordinates, independent of pixels, camera state and React.
 * Signed safe integers allow future world expansion in either direction.
 * A valid coordinate does not imply that a cell is unlocked or on a board.
 */
export type GridPosition = Readonly<{ x: number; y: number }>
