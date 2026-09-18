export type ImagePalette = [string, string, string]

type ColorBucket = {
  red: number
  green: number
  blue: number
  weight: number
}

const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0')

const colorDistance = (left: ColorBucket, right: ColorBucket) => Math.hypot(
  left.red / left.weight - right.red / right.weight,
  left.green / left.weight - right.green / right.weight,
  left.blue / left.weight - right.blue / right.weight,
)

export function selectImagePalette(data: Uint8ClampedArray, fallback: ImagePalette): ImagePalette {
  const buckets = new Map<string, ColorBucket>()

  for (let index = 0; index < data.length; index += 16) {
    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]
    const alpha = data[index + 3]
    if (alpha < 180) continue

    const max = Math.max(red, green, blue)
    const min = Math.min(red, green, blue)
    const lightness = (max + min) / 510
    const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))
    if (lightness < 0.08 || lightness > 0.94 || saturation < 0.1) continue

    const key = `${red >> 5}-${green >> 5}-${blue >> 5}`
    const skinTonePenalty = red > green * 1.08 && green > blue * 1.08 && red > 130 ? 0.68 : 1
    const weight = (0.55 + saturation * 1.55) * skinTonePenalty
    const bucket = buckets.get(key) ?? { red: 0, green: 0, blue: 0, weight: 0 }
    bucket.red += red * weight
    bucket.green += green * weight
    bucket.blue += blue * weight
    bucket.weight += weight
    buckets.set(key, bucket)
  }

  const candidates = [...buckets.values()].sort((left, right) => right.weight - left.weight)
  const selected: ColorBucket[] = []
  for (const candidate of candidates) {
    if (selected.every((color) => colorDistance(color, candidate) > 58)) selected.push(candidate)
    if (selected.length === 3) break
  }

  const colors = selected.map((color) => `#${toHex(color.red / color.weight)}${toHex(color.green / color.weight)}${toHex(color.blue / color.weight)}`)
  return [colors[0] ?? fallback[0], colors[1] ?? fallback[1], colors[2] ?? fallback[2]]
}

export function extractImagePalette(image: HTMLImageElement, fallback: ImagePalette): ImagePalette {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 48
    canvas.height = 48
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return fallback
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return selectImagePalette(context.getImageData(0, 0, canvas.width, canvas.height).data, fallback)
  } catch {
    return fallback
  }
}
