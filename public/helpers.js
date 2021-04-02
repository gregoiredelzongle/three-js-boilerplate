export function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

export function lerp (start, end, amt){
  return (1-amt)*start+amt*end
}