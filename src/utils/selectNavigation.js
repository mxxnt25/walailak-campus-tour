// Keep keyboard navigation independent of the rendered option list.
export function nextEnabledIndex(options, currentIndex, direction) {
  if (!options.length) return -1

  const step = direction < 0 ? -1 : 1
  for (let distance = 1; distance <= options.length; distance += 1) {
    const index = (currentIndex + step * distance + options.length * 2) % options.length
    if (!options[index].disabled) return index
  }
  return -1
}

export function firstEnabledIndex(options, fromEnd = false) {
  const index = fromEnd
    ? options.findLastIndex((option) => !option.disabled)
    : options.findIndex((option) => !option.disabled)
  return index
}
