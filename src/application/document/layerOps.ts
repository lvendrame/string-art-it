// docs/specs/13-layers.md — operations shared by Pin Layers and Thread Layers.
// Generic over the common {id, name, visible, locked} shape so both layer kinds reuse
// one implementation instead of two parallel copies.
interface LayerLike {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export function renameLayer<T extends LayerLike>(layers: T[], id: string, name: string): T[] {
  return layers.map((l) => (l.id === id ? { ...l, name } : l));
}

export function toggleLayerVisible<T extends LayerLike>(layers: T[], id: string): T[] {
  return layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
}

export function toggleLayerLocked<T extends LayerLike>(layers: T[], id: string): T[] {
  return layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l));
}

export function deleteLayer<T extends LayerLike>(layers: T[], id: string): T[] {
  return layers.filter((l) => l.id !== id);
}

// Moves the layer at `id` by `direction` (-1 = up/earlier, +1 = down/later) in the
// stacking order.
export function reorderLayer<T extends LayerLike>(layers: T[], id: string, direction: -1 | 1): T[] {
  const index = layers.findIndex((l) => l.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= layers.length) return layers;
  const next = [...layers];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
